import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type {
  BetaRawMessageStartEvent,
  BetaRawContentBlockStartEvent,
  BetaRawContentBlockDeltaEvent,
  BetaRawContentBlockStopEvent,
  BetaRawMessageDeltaEvent,
  BetaUsage as Usage,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { SystemPrompt } from '../../../utils/systemPromptType.js'
import type { Message, StreamEvent, SystemAPIErrorMessage, AssistantMessage } from '../../../types/message.js'
import type { Tools } from '../../../Tool.js'
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions/completions.mjs'
import { getGrokClient } from './client.js'
import { anthropicMessagesToOpenAI, anthropicToolsToOpenAI, anthropicToolChoiceToOpenAI, adaptOpenAIStreamToAnthropic, resolveGrokModel } from '@ant/model-provider'
import { normalizeMessagesForAPI } from '../../../utils/messages.js'
import type { SDKAssistantMessageError } from '../../../entrypoints/agentSdkTypes.js'
import { toolToAPISchema } from '../../../utils/api.js'
import { logForDebugging } from '../../../utils/debug.js'
import { addToTotalSessionCost } from '../../../cost-tracker.js'
import { calculateUSDCost } from '../../../utils/modelCost.js'
import { recordLLMObservation } from '../../../services/langfuse/tracing.js'
import { convertMessagesToLangfuse, convertOutputToLangfuse, convertToolsToLangfuse } from '../../../services/langfuse/convert.js'
import type { Options } from '../claude.js'
import { randomUUID } from 'crypto'
import {
  createAssistantAPIErrorMessage,
  normalizeContentFromAPI,
} from '../../../utils/messages.js'

/**
 * Grok (xAI) query path. Grok uses an OpenAI-compatible API, so we reuse
 * the OpenAI message/tool converters and stream adapter. Only the client
 * (different base URL + API key) and model mapping are Grok-specific.
 */
export async function* queryModelGrok(
  messages: Message[],
  systemPrompt: SystemPrompt,
  tools: Tools,
  signal: AbortSignal,
  options: Options,
): AsyncGenerator<
  StreamEvent | AssistantMessage | SystemAPIErrorMessage,
  void
> {
  try {
    const grokModel = resolveGrokModel(options.model)
    const messagesForAPI = normalizeMessagesForAPI(messages, tools)

    const toolSchemas = await Promise.all(
      tools.map(tool =>
        toolToAPISchema(tool, {
          getToolPermissionContext: options.getToolPermissionContext,
          tools,
          agents: options.agents,
          allowedAgentTypes: options.allowedAgentTypes,
          model: options.model,
        }),
      ),
    )
    const standardTools = toolSchemas.filter(
      (t): t is BetaToolUnion & { type: string } => {
        const anyT = t as unknown as Record<string, unknown>
        return anyT.type !== 'advisor_20260301' && anyT.type !== 'computer_20250124'
      },
    )

    const openaiMessages = anthropicMessagesToOpenAI(messagesForAPI, systemPrompt)
    const openaiTools = anthropicToolsToOpenAI(standardTools)
    const openaiToolChoice = anthropicToolChoiceToOpenAI(options.toolChoice)

    const client = getGrokClient({
      maxRetries: 0,
      fetchOverride: options.fetchOverride as typeof fetch | undefined,
      source: options.querySource,
    })

    logForDebugging(`[Grok] Calling model=${grokModel}, messages=${openaiMessages.length}, tools=${openaiTools.length}`)

    const stream = await client.chat.completions.create(
      {
        model: grokModel,
        messages: openaiMessages,
        ...(openaiTools.length > 0 && {
          tools: openaiTools,
          ...(openaiToolChoice && { tool_choice: openaiToolChoice }),
        }),
        stream: true,
        stream_options: { include_usage: true },
        ...(options.temperatureOverride !== undefined && {
          temperature: options.temperatureOverride,
        }),
      } as ChatCompletionCreateParamsStreaming,
      {
        signal,
      },
    )

    const adaptedStream = adaptOpenAIStreamToAnthropic(stream as AsyncIterable<ChatCompletionChunk>, grokModel)

    const contentBlocks: Record<number, Record<string, unknown>> = {}
    const collectedMessages: AssistantMessage[] = []
    let partialMessage: Record<string, unknown> | null = null
    let usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }
    let ttftMs = 0
    const start = Date.now()

    for await (const event of adaptedStream) {
      switch (event.type) {
        case 'message_start': {
          const startEvent = event as BetaRawMessageStartEvent
          partialMessage = startEvent.message as unknown as Record<string, unknown>
          ttftMs = Date.now() - start
          const startUsage = startEvent.message?.usage
          if (startUsage) {
            usage = {
              input_tokens: startUsage.input_tokens ?? usage.input_tokens,
              output_tokens: startUsage.output_tokens ?? usage.output_tokens,
              cache_creation_input_tokens: startUsage.cache_creation_input_tokens ?? usage.cache_creation_input_tokens,
              cache_read_input_tokens: startUsage.cache_read_input_tokens ?? usage.cache_read_input_tokens,
            }
          }
          break
        }
        case 'content_block_start': {
          const blockStartEvent = event as BetaRawContentBlockStartEvent
          const idx = blockStartEvent.index
          const cb = blockStartEvent.content_block
          if (cb.type === 'tool_use') {
            contentBlocks[idx] = { ...cb, input: '' }
          } else if (cb.type === 'text') {
            contentBlocks[idx] = { ...cb, text: '' }
          } else if (cb.type === 'thinking') {
            contentBlocks[idx] = { ...cb, thinking: '', signature: '' }
          } else {
            contentBlocks[idx] = { ...cb }
          }
          break
        }
        case 'content_block_delta': {
          const deltaEvent = event as BetaRawContentBlockDeltaEvent
          const idx = deltaEvent.index
          const delta = deltaEvent.delta
          const block = contentBlocks[idx]
          if (!block) break
          if (delta.type === 'text_delta') {
            block.text = ((block.text as string) || '') + delta.text
          } else if (delta.type === 'input_json_delta') {
            block.input = ((block.input as string) || '') + delta.partial_json
          } else if (delta.type === 'thinking_delta') {
            block.thinking = ((block.thinking as string) || '') + delta.thinking
          } else if (delta.type === 'signature_delta') {
            block.signature = delta.signature
          }
          break
        }
        case 'content_block_stop': {
          const stopEvent = event as BetaRawContentBlockStopEvent
          const idx = stopEvent.index
          const block = contentBlocks[idx]
          if (!block || !partialMessage) break

          const m = {
            message: {
              ...partialMessage,
              content: normalizeContentFromAPI([block] as unknown as Parameters<typeof normalizeContentFromAPI>[0], tools, options.agentId),
            },
            requestId: undefined,
            type: 'assistant' as const,
            uuid: randomUUID(),
            timestamp: new Date().toISOString(),
          } as unknown as AssistantMessage
          collectedMessages.push(m)
          yield m
          break
        }
        case 'message_delta': {
          const msgDeltaEvent = event as BetaRawMessageDeltaEvent
          const deltaUsage = msgDeltaEvent.usage
          if (deltaUsage) {
            usage = {
              input_tokens: deltaUsage.input_tokens ?? usage.input_tokens,
              output_tokens: deltaUsage.output_tokens ?? usage.output_tokens,
              cache_creation_input_tokens: deltaUsage.cache_creation_input_tokens ?? usage.cache_creation_input_tokens,
              cache_read_input_tokens: deltaUsage.cache_read_input_tokens ?? usage.cache_read_input_tokens,
            }
          }
          break
        }
        case 'message_stop':
          break
      }

      if (event.type === 'message_stop' && usage.input_tokens + usage.output_tokens > 0) {
        const costUSD = calculateUSDCost(grokModel, usage as unknown as Usage)
        addToTotalSessionCost(costUSD, usage as unknown as Usage, options.model)
      }

      yield {
        type: 'stream_event',
        event,
        ...(event.type === 'message_start' ? { ttftMs } : undefined),
      } as StreamEvent
    }

    // Record LLM observation in Langfuse (no-op if not configured)
    recordLLMObservation(options.langfuseTrace ?? null, {
      model: grokModel,
      provider: 'grok',
      input: convertMessagesToLangfuse(messagesForAPI, systemPrompt),
      output: convertOutputToLangfuse(collectedMessages),
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
      },
      startTime: new Date(start),
      endTime: new Date(),
      completionStartTime: ttftMs > 0 ? new Date(start + ttftMs) : undefined,
      tools: convertToolsToLangfuse(toolSchemas as unknown[]),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logForDebugging(`[Grok] Error: ${errorMessage}`, { level: 'error' })
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage}`,
      apiError: 'api_error',
      error: (error instanceof Error ? error : new Error(String(error))) as unknown as SDKAssistantMessageError,
    })
  }
}

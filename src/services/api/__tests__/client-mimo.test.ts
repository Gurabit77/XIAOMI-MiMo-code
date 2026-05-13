import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { ClientOptions } from '@anthropic-ai/sdk'
import { getAnthropicClient } from '../client.js'

const ENV_KEYS = [
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_CUSTOM_HEADERS',
  'ANTHROPIC_API_KEY',
  'CLAUDE_CONFIG_DIR',
  'MIMO_API_KEY',
  'MIMO_CODE_RUNTIME',
] as const

let savedEnv: Record<string, string | undefined>
let savedMacro: unknown

beforeEach(() => {
  savedEnv = {}
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
  savedMacro = globalThis.MACRO
  ;(globalThis as typeof globalThis & { MACRO: typeof MACRO }).MACRO = {
    VERSION: 'test',
    BUILD_TIME: new Date(0).toISOString(),
    FEEDBACK_CHANNEL: '',
    ISSUES_EXPLAINER: '',
    NATIVE_PACKAGE_URL: '',
    PACKAGE_URL: '',
    VERSION_CHANGELOG: '',
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
  ;(globalThis as typeof globalThis & { MACRO: typeof MACRO }).MACRO =
    savedMacro as typeof MACRO
})

describe('getAnthropicClient in MiMo runtime', () => {
  test('sends api-key and explicitly omits Anthropic auth headers', async () => {
    process.env.MIMO_CODE_RUNTIME = '1'
    process.env.MIMO_API_KEY = 'tp-test-key-12345678901234567890'
    process.env.ANTHROPIC_BASE_URL = 'https://mimo.example/anthropic'
    process.env.ANTHROPIC_CUSTOM_HEADERS =
      'Authorization: Bearer stale\nx-api-key: stale'

    let observedHeaders: Headers | undefined
    const fetchOverride: ClientOptions['fetch'] = async (_input, init) => {
      observedHeaders = new Headers(init?.headers)
      return new Response(
        JSON.stringify({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          content: [],
          model: 'mimo-v2.5',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }

    const client = await getAnthropicClient({
      maxRetries: 0,
      fetchOverride,
      source: 'mimo-test',
    })

    await client.messages.create({
      model: 'mimo-v2.5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(observedHeaders?.get('api-key')).toBe(
      'tp-test-key-12345678901234567890',
    )
    expect(observedHeaders?.has('authorization')).toBe(false)
    expect(observedHeaders?.has('x-api-key')).toBe(false)
  })

  test('fails fast with a helpful error when key is missing', async () => {
    process.env.MIMO_CODE_RUNTIME = '1'
    process.env.ANTHROPIC_BASE_URL = 'https://mimo.example/anthropic'

    await expect(
      getAnthropicClient({ maxRetries: 0, fetchOverride: fetch }),
    ).rejects.toThrow('MiMo API key is required')
  })
})

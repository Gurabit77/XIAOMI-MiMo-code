import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { clearBetasCaches, getMergedBetas } from '../betas.js'
import {
  modelSupportsAdaptiveThinking,
  modelSupportsThinking,
} from '../thinking.js'

const ENV_KEYS = [
  'ANTHROPIC_BETAS',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  'MIMO_CODE_RUNTIME',
  'USER_TYPE',
] as const

let savedEnv: Record<string, string | undefined>

beforeEach(() => {
  savedEnv = {}
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
  process.env.MIMO_CODE_RUNTIME = '1'
  clearBetasCaches()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
  clearBetasCaches()
})

describe('MiMo provider capabilities', () => {
  test('does not send Claude beta headers for agentic requests', () => {
    process.env.ANTHROPIC_BETAS = 'context-1m-2025-08-07'

    expect(getMergedBetas('mimo-v2.5', { isAgenticQuery: true })).toEqual([])
  })

  test('does not inherit Claude thinking support or capability overrides', () => {
    const model = 'claude-sonnet-4-6-mimo-capability-test'
    process.env.USER_TYPE = 'ant'
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = model
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES =
      'thinking,adaptive_thinking'

    expect(modelSupportsThinking(model)).toBe(false)
    expect(modelSupportsAdaptiveThinking(model)).toBe(false)
  })
})

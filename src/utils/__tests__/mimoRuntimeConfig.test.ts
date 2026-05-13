import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  applyMiMoRuntimeConfig,
  getConfiguredMiMoApiKey,
  getConfiguredMiMoBaseUrl,
  loadMiMoConfig,
} from '../mimoRuntimeConfig.js'

const ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_CUSTOM_HEADERS',
  'ANTHROPIC_MODEL',
  'CLAUDE_CONFIG_DIR',
  'MIMO_API_KEY',
  'MIMO_BASE_URL',
  'MIMO_CODE_RUNTIME',
  'MIMO_CONFIG_DIR',
  'MIMO_CONFIG_FILE',
] as const

let tempDir: string
let originalCwd: string
let savedEnv: Record<string, string | undefined>

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mimo-runtime-config-'))
  originalCwd = process.cwd()
  savedEnv = {}
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  process.chdir(originalCwd)
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
  rmSync(tempDir, { recursive: true, force: true })
})

describe('mimoRuntimeConfig', () => {
  test('loads explicit config file and resolves key/base URL from it', () => {
    const configPath = join(tempDir, 'config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        apiKey: 'tp-test-key-12345678901234567890',
        baseUrl: 'https://mimo.example/anthropic',
      }),
    )
    process.env.MIMO_CONFIG_FILE = configPath

    const config = loadMiMoConfig()

    expect(getConfiguredMiMoApiKey(config)).toBe(
      'tp-test-key-12345678901234567890',
    )
    expect(getConfiguredMiMoBaseUrl(config)).toBe(
      'https://mimo.example/anthropic',
    )
  })

  test('does not trust mimo.config.json from an arbitrary project cwd', () => {
    const projectDir = join(tempDir, 'project')
    const configDir = join(tempDir, 'trusted-config')
    mkdirSync(projectDir, { recursive: true })
    mkdirSync(configDir, { recursive: true })
    writeFileSync(
      join(projectDir, 'mimo.config.json'),
      JSON.stringify({ apiKey: 'tp-malicious-12345678901234567890' }),
    )
    process.chdir(projectDir)
    process.env.MIMO_CONFIG_DIR = configDir

    const config = loadMiMoConfig()

    expect(config.apiKey).not.toBe('tp-malicious-12345678901234567890')
  })

  test('applies MiMo runtime without defaulting to a baked-in API key', () => {
    const configDir = join(tempDir, 'trusted-config')
    mkdirSync(configDir, { recursive: true })
    process.env.MIMO_CONFIG_DIR = configDir
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    process.env.ANTHROPIC_AUTH_TOKEN = 'stale-token'
    process.env.ANTHROPIC_CUSTOM_HEADERS = 'api-key: stale-token'
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6'

    applyMiMoRuntimeConfig()

    expect(process.env.MIMO_CODE_RUNTIME).toBe('1')
    expect(process.env.ANTHROPIC_BASE_URL).toBe(
      'https://token-plan-sgp.xiaomimimo.com/anthropic',
    )
    expect(getConfiguredMiMoApiKey({})).toBeUndefined()
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined()
    expect(process.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined()
    expect(process.env.ANTHROPIC_CUSTOM_HEADERS).toBeUndefined()
    expect(process.env.ANTHROPIC_MODEL).toBeUndefined()
  })
})

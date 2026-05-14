import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type MiMoConfig = {
  apiKey?: string
  baseUrl?: string
  configDir?: string
  models?: {
    haiku?: string
    sonnet?: string
    opus?: string
    smallFast?: string
  }
}

const DEFAULT_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/anthropic'
const CONFIG_FILENAMES = ['mimo.config.local.json', 'mimo.config.json']

export function isMiMoRuntime(): boolean {
  return (
    process.env.MIMO_CODE_RUNTIME === '1' ||
    process.env.CLAUDE_CONFIG_DIR?.endsWith('.mimo') === true
  )
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function expandHome(path: string): string {
  if (path === '~') return process.env.HOME || path
  if (path.startsWith('~/')) {
    return join(process.env.HOME || '', path.slice(2))
  }
  return path
}

function readJsonConfig(path: string): MiMoConfig {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as MiMoConfig
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read MiMo config at ${path}: ${message}`)
  }
}

function findPackageRoot(start: string): string | undefined {
  let current = resolve(start)
  for (;;) {
    const packageJsonPath = join(current, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          readFileSync(packageJsonPath, 'utf8'),
        ) as {
          name?: string
        }
        if (packageJson.name === 'mimo-code') return current
      } catch {
        // Keep walking upward; a bad package.json here is not necessarily ours.
      }
    }
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

function findConfigFile(): string | undefined {
  const explicitPath = nonEmpty(process.env.MIMO_CONFIG_FILE)
  if (explicitPath) return resolve(expandHome(explicitPath))

  const configDir = getMiMoConfigDir()
  const roots = [
    configDir,
    findPackageRoot(dirname(fileURLToPath(import.meta.url))),
  ].filter((root): root is string => Boolean(root))

  for (const root of [...new Set(roots)]) {
    for (const filename of CONFIG_FILENAMES) {
      const path = join(root, filename)
      if (existsSync(path)) return path
    }
  }

  return undefined
}

export function loadMiMoConfig(): MiMoConfig {
  const path = findConfigFile()
  return path ? readJsonConfig(path) : {}
}

export function getMiMoConfigDir(config?: MiMoConfig): string | undefined {
  const configuredDir =
    nonEmpty(process.env.MIMO_CONFIG_DIR) || nonEmpty(config?.configDir)
  if (configuredDir) return resolve(expandHome(configuredDir))
  if (!process.env.HOME) return undefined
  return join(process.env.HOME, '.mimo')
}

export function getConfiguredMiMoApiKey(
  config = loadMiMoConfig(),
): string | undefined {
  return nonEmpty(process.env.MIMO_API_KEY) || nonEmpty(config.apiKey)
}

export function getConfiguredMiMoBaseUrl(config = loadMiMoConfig()): string {
  return (
    nonEmpty(process.env.MIMO_BASE_URL) ||
    nonEmpty(config.baseUrl) ||
    DEFAULT_BASE_URL
  )
}

export function getMiMoMissingApiKeyMessage(): string {
  return [
    'MiMo API key is required.',
    'Set MIMO_API_KEY, or create a MiMo config file at ~/.mimo/mimo.config.json.',
    'You can also point MIMO_CONFIG_FILE at an explicit config file.',
  ].join(' ')
}

export function applyMiMoRuntimeConfig(): void {
  const config = loadMiMoConfig()
  const models = config.models || {}
  const configDir = getMiMoConfigDir(config)

  process.env.MIMO_CODE_RUNTIME = '1'

  process.env.CLAUDE_CONFIG_DIR =
    nonEmpty(process.env.CLAUDE_CONFIG_DIR) ||
    configDir ||
    join(process.cwd(), '.mimo')

  process.env.ANTHROPIC_BASE_URL = getConfiguredMiMoBaseUrl(config)
  const apiKey = getConfiguredMiMoApiKey(config) || ''
  process.env.MIMO_API_KEY = apiKey || process.env.MIMO_API_KEY || ''
  process.env.ANTHROPIC_AUTH_TOKEN = process.env.MIMO_API_KEY
  delete process.env.ANTHROPIC_CUSTOM_HEADERS
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_MODEL

  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL =
    nonEmpty(process.env.MIMO_HAIKU_MODEL) ||
    nonEmpty(models.haiku) ||
    'mimo-v2.5'
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL =
    nonEmpty(process.env.MIMO_SONNET_MODEL) ||
    nonEmpty(models.sonnet) ||
    'mimo-v2.5'
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL =
    nonEmpty(process.env.MIMO_OPUS_MODEL) ||
    nonEmpty(models.opus) ||
    'mimo-v2.5-pro'
  process.env.ANTHROPIC_SMALL_FAST_MODEL =
    nonEmpty(process.env.MIMO_SMALL_FAST_MODEL) ||
    nonEmpty(models.smallFast) ||
    'mimo-v2.5'
}

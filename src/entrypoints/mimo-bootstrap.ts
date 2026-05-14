// MiMo Code bootstrap — MUST run before any other module loads.
// Sets env vars that other modules read at init time (memoized on first access).
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// Mark as MiMo runtime (controls logo, branding, login flow)
process.env.MIMO_CODE_RUNTIME = '1'

// Isolate config: ~/.mimo instead of ~/.claude
const mimoConfigDir = join(homedir(), '.mimo')
if (!process.env.CLAUDE_CONFIG_DIR) {
  process.env.CLAUDE_CONFIG_DIR = mimoConfigDir
}

// Read ~/.mimo/mimo.config.json
let fileConfig: { baseUrl?: string; apiKey?: string } = {}
const configPath = join(mimoConfigDir, 'mimo.config.json')
if (existsSync(configPath)) {
  try { fileConfig = JSON.parse(readFileSync(configPath, 'utf8')) } catch {}
}

// Resolve API key: env var > config file
const mimoApiKey = process.env.MIMO_API_KEY || fileConfig.apiKey || ''
if (!mimoApiKey) {
  console.error('\x1b[33m⚠ MIMO_API_KEY not set. Run /login to configure, or see docs/SETUP.md\x1b[0m')
}
process.env.MIMO_API_KEY = mimoApiKey

// Resolve base URL: env var > config file > default
const mimoBaseUrl = process.env.MIMO_BASE_URL || fileConfig.baseUrl || 'https://token-plan-cn.xiaomimimo.com/anthropic'
process.env.ANTHROPIC_BASE_URL = mimoBaseUrl
process.env.MIMO_BASE_URL = mimoBaseUrl

// Standard Anthropic SDK auth: use ANTHROPIC_AUTH_TOKEN (maps to x-api-key in SDK)
process.env.ANTHROPIC_AUTH_TOKEN = mimoApiKey
// Do NOT set custom headers — MiMo uses standard Anthropic x-api-key auth
delete process.env.ANTHROPIC_CUSTOM_HEADERS
delete process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_MODEL

// Force MiMo models
process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'mimo-v2.5-pro'
process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'mimo-v2.5-pro'
process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'mimo-v2.5-pro'
process.env.ANTHROPIC_SMALL_FAST_MODEL = 'mimo-v2.5-pro'
process.env.API_TIMEOUT_MS = process.env.API_TIMEOUT_MS || '3000000'

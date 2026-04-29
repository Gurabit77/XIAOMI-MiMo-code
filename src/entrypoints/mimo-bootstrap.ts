// MiMo Code bootstrap — MUST run before any other module loads.
// Sets env vars that other modules read at init time (memoized on first access).
import { homedir } from 'os'
import { join } from 'path'

// Isolate config: ~/.mimo instead of ~/.claude
if (!process.env.CLAUDE_CONFIG_DIR) {
  process.env.CLAUDE_CONFIG_DIR = join(homedir(), '.mimo')
}

// Force MiMo Token Plan API
process.env.ANTHROPIC_BASE_URL = process.env.MIMO_BASE_URL || 'https://token-plan-sgp.xiaomimimo.com/anthropic'
// Token Plan uses "api-key" header (not x-api-key or Authorization: Bearer)
// Set MIMO_API_KEY env var or configure in ~/.mimo/settings.json
const mimoApiKey = process.env.MIMO_API_KEY || ''
if (!mimoApiKey) {
  console.error('\x1b[33m⚠ MIMO_API_KEY not set. Run with MIMO_API_KEY=tp-xxx mimo, or see docs/SETUP.md\x1b[0m')
}
process.env.ANTHROPIC_AUTH_TOKEN = mimoApiKey
process.env.ANTHROPIC_CUSTOM_HEADERS = mimoApiKey ? `api-key: ${mimoApiKey}` : ''
delete process.env.ANTHROPIC_API_KEY

// Force MiMo models (lowercase with dots, as required by Token Plan API)
process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'mimo-v2.5'
process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'mimo-v2.5'
process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'mimo-v2.5-pro'
process.env.ANTHROPIC_SMALL_FAST_MODEL = 'mimo-v2.5'
process.env.API_TIMEOUT_MS = process.env.API_TIMEOUT_MS || '3000000'

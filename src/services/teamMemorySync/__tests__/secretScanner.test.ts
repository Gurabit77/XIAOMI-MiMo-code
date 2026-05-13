import { describe, expect, test } from 'bun:test'
import { redactSecrets, scanForSecrets } from '../secretScanner.js'

describe('team memory secret scanner', () => {
  test('detects and redacts MiMo Token Plan keys', () => {
    const content = 'api-key: tp-12345678901234567890abcdef'

    expect(scanForSecrets(content)).toContainEqual({
      ruleId: 'mimo-token-plan-key',
      label: 'Mimo Token Plan Key',
    })
    expect(redactSecrets(content)).toBe('api-key: [REDACTED]')
  })
})

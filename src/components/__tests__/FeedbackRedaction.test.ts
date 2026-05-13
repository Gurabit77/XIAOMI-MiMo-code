import { describe, expect, test } from 'bun:test'
import { redactSensitiveInfo } from '../Feedback.js'

describe('redactSensitiveInfo', () => {
  test('redacts MiMo Token Plan keys and api-key headers', () => {
    const text = 'api-key: tp-12345678901234567890abcdef x-api-key: stale-token'

    expect(redactSensitiveInfo(text)).toBe(
      'api-key: [REDACTED_API_KEY] x-api-key: [REDACTED_API_KEY]',
    )
  })
})

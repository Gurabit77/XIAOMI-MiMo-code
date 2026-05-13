import { describe, expect, test } from 'bun:test'
import { sanitizeInboundWebhookContent } from '../webhookSanitizer.js'

describe('sanitizeInboundWebhookContent', () => {
  test('redacts MiMo Token Plan keys', () => {
    expect(
      sanitizeInboundWebhookContent('token=tp-12345678901234567890abcdef'),
    ).toBe('token=[REDACTED_MIMO_KEY]')
  })
})

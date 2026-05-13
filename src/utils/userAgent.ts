/**
 * User-Agent string helpers.
 *
 * Kept dependency-free so SDK-bundled code (bridge, cli/transports) can
 * import without pulling in auth.ts and its transitive dependency tree.
 */

export function getClaudeCodeUserAgent(): string {
  const product =
    process.env.MIMO_CODE_RUNTIME === '1' ? 'mimo-code' : 'claude-code'
  return `${product}/${MACRO.VERSION}`
}

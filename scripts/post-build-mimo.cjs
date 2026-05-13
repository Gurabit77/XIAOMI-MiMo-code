#!/usr/bin/env node
// Post-build: replace Claude branding in dist/ with MiMo branding
const { readdirSync, readFileSync, writeFileSync } = require('fs')
const { join, relative } = require('path')

const distDir = join(__dirname, '..', 'dist')

// Order matters: longer/more-specific patterns first to avoid partial matches
const replacements = [
  // === UI-facing sentences ===
  ["User approved Claude's plan", "User approved MiMo's plan"],
  ["User answered Claude's questions", "User answered MiMo's questions"],
  ["comments on Claude's plan", "comments on MiMo's plan"],
  ["Claude is now exploring", "MiMo is now exploring"],
  ["Claude's own window", "MiMo's own window"],
  ["Claude will not read", "MiMo will not read"],
  ["when Claude is run", "when MiMo is run"],
  ["ask Claude to help", "ask MiMo to help"],
  ["Claude wants to enter plan mode", "MiMo wants to enter plan mode"],
  ["Claude wants to exit plan mode", "MiMo wants to exit plan mode"],
  ["Claude wants to guide you", "MiMo wants to guide you"],
  ["Claude wants to fetch content", "MiMo wants to fetch content"],
  ["Claude wants to search the web", "MiMo wants to search the web"],
  ["Claude has written up a plan", "MiMo has written up a plan"],
  ["Claude may use instructions", "MiMo may use instructions"],
  ["Claude found these results", "MiMo found these results"],
  ["Claude explains its implementation", "MiMo explains its implementation"],
  ["Claude decides when and how much to think", "MiMo decides when and how much to think"],
  ["Claude requested permissions to use", "MiMo requested permissions to use"],
  ["Claude requested permissions to write to", "MiMo requested permissions to write to"],
  ["Claude requested permissions to read from", "MiMo requested permissions to read from"],
  ["Claude wrote for the human to read", "MiMo wrote for the human to read"],
  ["Claude writes it", "MiMo writes it"],
  ["Claude will perform the instructions", "MiMo will perform the instructions"],
  ["Claude will analyze the comment", "MiMo will analyze the comment"],
  ["Claude while it works to steer Claude", "MiMo while it works to steer MiMo"],
  ["Claude where binary content was saved", "MiMo where binary content was saved"],
  ["Claude watches for externally", "MiMo watches for externally"],
  ["Claude was in before entering", "MiMo was in before entering"],
  ["Claude window hides", "MiMo window hides"],
  ["Claude window", "MiMo window"],
  ["Claude exits", "MiMo exits"],
  ["Claude session is currently using the computer", "MiMo session is currently using the computer"],
  ["Claude session", "MiMo session"],
  ["Claude responses and voice dictation", "MiMo responses and voice dictation"],
  ["restart Claude Code", "restart MiMo Code"],
  ["Claude Code supports", "MiMo Code supports"],

  // === Claude in Chrome → MiMo in Chrome ===
  ["Claude in Chrome", "MiMo in Chrome"],
  ["Claude Chrome Extension", "MiMo Chrome Extension"],
  ["Claude Chrome Native Host", "MiMo Chrome Native Host"],

  // === Claude Desktop → MiMo Desktop ===
  ["Claude Desktop integration only works", "MiMo Desktop integration only works"],
  ["Claude Desktop is not installed", "MiMo Desktop is not installed"],
  ["Claude Desktop", "MiMo Desktop"],

  // === Subscription/account text ===
  ["Claude Opus is not available with the Claude Pro plan", "MiMo Opus is not available with the MiMo Pro plan"],
  ["Claude account with subscription", "MiMo account with subscription"],
  ["Claude subscription", "MiMo subscription"],
  ["Claude account", "MiMo account"],
  ["Claude marketplace", "MiMo marketplace"],
  ["Claude Pro", "MiMo Pro"],
  ["Claude Max", "MiMo Max"],
  ["Claude Team", "MiMo Team"],

  // === CLI commands ===
  ["'claude mcp xaa setup'", "'mimo mcp xaa setup'"],
  ["'claude mcp xaa login'", "'mimo mcp xaa login'"],
  ["'claude auth login'", "'mimo auth login'"],
  ["claude mcp add", "mimo mcp add"],

  // === Paths (user-visible install paths) ===
  ["~/.local/bin/claude", "~/.local/bin/mimo"],
  ['alias claude="~/.claude/local/claude"', 'alias mimo="~/.mimo/local/mimo"'],

  // === Agent SDK references ===
  ["Claude Agent SDK", "MiMo Agent SDK"],
  ["Claude CLI", "MiMo CLI"],

  // === GitHub app (cosmetic only, URL stays) ===
  ["https://github.com/apps/claude", "https://github.com/apps/mimo"],

  // === Generic "Claude to" patterns in UI text ===
  ["Claude to read CI results", "MiMo to read CI results"],

  // === Shell/install scripts ===
  ['$HOME/.local/bin/claude', '$HOME/.local/bin/mimo'],
  ['.local/bin/claude")', '.local/bin/mimo")'],
  ['command -v claude', 'command -v mimo'],
  ['$CLAUDE_BIN', '$MIMO_BIN'],
  ['CLAUDE_BIN=', 'MIMO_BIN='],

  // === Permission messages ===
  ["Claude requested permissions to edit", "MiMo requested permissions to edit"],

  // === Auth/login messages ===
  ["Voice mode requires a Claude.ai account", "Voice mode requires a MiMo account"],
  ["require authentication with a Claude.ai account", "require authentication with a MiMo account"],
  ["does not have access to Claude. Please login", "does not have access to MiMo. Please login"],
  ["Help improve Claude", "Help improve MiMo"],

  // === Misc UI text ===
  ["[Image data detected and sent to Claude]", "[Image data detected and sent to MiMo]"],
  ["when Claude finishes", "when MiMo finishes"],
  ["stop button in the Claude ", "stop button in the MiMo "],
  ["What should Claude do instead?", "What should MiMo do instead?"],
  ["Claude has context of ", "MiMo has context of "],
  ["Force Claude to use multi-agent mode", "Force MiMo to use multi-agent mode"],

  // === More UI/help text ===
  ["Would removing this cause Claude to make mistakes?", "Would removing this cause MiMo to make mistakes?"],
  ["Whether Claude should continue after hook", "Whether MiMo should continue after hook"],
  ["When should Claude use this agent?", "When should MiMo use this agent?"],
  ["Use your existing Claude ", "Use your existing MiMo "],
  ["Use the Claude-in-Chrome MCP", "Use the MiMo-in-Chrome MCP"],
  ["Use /memory to view and manage Claude memory", "Use /memory to view and manage MiMo memory"],
  ["Turning ON the improve Claude setting", "Turning ON the improve MiMo setting"],
  ["The Claude Agent process exited unexpectedly", "The MiMo Agent process exited unexpectedly"],
  ["Teleport requires a Claude.ai account", "Teleport requires a MiMo account"],
  ["Sorry, Claude encountered an error", "Sorry, MiMo encountered an error"],
  ["Show QR code to download the Claude mobile app", "Show QR code to download the MiMo mobile app"],
  ["Show Claude logo watermark", "Show MiMo logo watermark"],
  ["Set up Claude GitHub Actions", "Set up MiMo GitHub Actions"],
  ["Searching with Claude", "Searching with MiMo"],
  ["Search deeply using Claude", "Search deeply using MiMo"],
  ["using the Claude desktop app: clau.de/desktop", "using the MiMo desktop app"],
  ["after Claude finishes to review", "after MiMo finishes to review"],
  ["/install-slack-app to use Claude in Slack", "/install-slack-app to use MiMo in Slack"],
  ["create a CLAUDE.md file with instructions for Claude", "create a CLAUDE.md file with instructions for MiMo"],
  ["Right before Claude concludes its response", "Right before MiMo concludes its response"],
  ["Relive your year of coding with Claude", "Relive your year of coding with MiMo"],
  ["Push to your mobile device when idle after Claude finishes", "Push to your mobile device when idle after MiMo finishes"],
  ["latest version of the Claude mobile app", "latest version of the MiMo mobile app"],
  ["sign in with your Claude.ai account", "sign in with your MiMo account"],
  ["you or Claude invoke with", "you or MiMo invoke with"],
  ["Open Chrome with the Claude extension", "Open Chrome with the MiMo extension"],
  ["Chrome is open with the Claude extension installed", "Chrome is open with the MiMo extension installed"],
  ["Log in to Claude", "Log in to MiMo"],
  ["another Claude instance may be running", "another MiMo instance may be running"],
  ["Install the Claude Slack app", "Install the MiMo Slack app"],
  ["Hello, Claude!", "Hello, MiMo!"],
  ["Generate with Claude", "Generate with MiMo"],
  ["Edit Claude memory files", "Edit MiMo memory files"],
  ["Does Claude...", "Does MiMo..."],
  ["Do you want to allow Claude to fetch", "Do you want to allow MiMo to fetch"],
  ["another process is currently installing Claude", "another process is currently installing MiMo"],
  ["Connect Claude to your IDE", "Connect MiMo to your IDE"],
  ["Claude Got Blocked", "MiMo Got Blocked"],
  ["Claude Enterprise", "MiMo Enterprise"],
  ["Claude API", "MiMo API"],
  ["Can Claude...", "Can MiMo..."],
  ["logged into the Claude browser extension with the same claude.ai account as MiMo Code", "logged into the MiMo browser extension with the same account as MiMo Code"],
  ["Allow Claude to push to your mobile device", "Allow MiMo to push to your mobile device"],
  ["the Claude.ai marketplace sync requires", "the MiMo marketplace sync requires"],
]

let patched = 0
for (const path of listJavaScriptFiles(distDir)) {
  let content = readFileSync(path, 'utf8')
  let changed = false
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to)
      changed = true
    }
  }
  if (changed) {
    writeFileSync(path, content)
    patched++
  }
}
console.log(`Post-build: patched ${patched} dist files`)

function listJavaScriptFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listJavaScriptFiles(p))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(p)
    }
  }
  return files.sort((a, b) =>
    relative(distDir, a).localeCompare(relative(distDir, b)),
  )
}

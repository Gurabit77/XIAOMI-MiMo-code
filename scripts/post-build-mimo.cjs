#!/usr/bin/env node
// Post-build: replace Claude references from precompiled workspace packages in dist/
const { readdirSync, readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

const distDir = join(__dirname, '..', 'dist')
const replacements = [
  ["User approved Claude's plan", "User approved MiMo's plan"],
  ["Claude is now exploring", "MiMo is now exploring"],
  ["Claude's own window", "MiMo's own window"],
  ["Claude will not read", "MiMo will not read"],
  ["comments on Claude's plan", "comments on MiMo's plan"],
  ["when Claude is run", "when MiMo is run"],
  ["ask Claude to help", "ask MiMo to help"],
  ["User answered Claude's questions", "User answered MiMo's questions"],
]

let patched = 0
for (const file of readdirSync(distDir).filter(f => f.endsWith('.js'))) {
  const path = join(distDir, file)
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

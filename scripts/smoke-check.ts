#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'

type Step = {
  name: string
  command: string[]
}

const steps: Step[] = [
  { name: 'TypeScript typecheck', command: ['bun', 'run', 'typecheck'] },
  { name: 'Production build', command: ['bun', 'run', 'build'] },
  { name: 'Bundle integrity', command: ['bun', 'run', 'check:bundle'] },
  { name: 'Local health check', command: ['bun', 'run', 'health'] },
  { name: 'Node entry point', command: ['node', 'dist/cli-node.js', '--version'] },
  { name: 'Bun entry point', command: ['bun', 'dist/cli-bun.js', '--version'] },
]

for (const step of steps) {
  console.log(`\n==> ${step.name}`)
  const [cmd, ...args] = step.command
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

console.log('\nSmoke check passed.')

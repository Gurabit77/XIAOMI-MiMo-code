#!/usr/bin/env bun
import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

type Check = {
  name: string
  run: () => Promise<void>
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function assertFile(path: string): Promise<void> {
  const info = await stat(path)
  if (!info.isFile()) throw new Error(`${path} is not a file`)
}

async function assertExecutable(path: string): Promise<void> {
  await assertFile(path)
  await access(path, constants.X_OK)
}

const checks: Check[] = [
  {
    name: 'Bun runtime is available',
    run: async () => {
      if (!Bun.version) throw new Error('Bun version unavailable')
    },
  },
  {
    name: 'package.json is valid',
    run: async () => {
      const pkg = (await readJson('package.json')) as { name?: string }
      if (pkg.name !== 'mimo-code') throw new Error('package name is not mimo-code')
    },
  },
  {
    name: 'MiMo local config JSON is valid when present',
    run: async () => {
      for (const file of ['mimo.config.json', 'mimo.config.local.json']) {
        try {
          await access(file, constants.F_OK)
        } catch {
          continue
        }
        await readJson(file)
      }
    },
  },
  {
    name: 'dist entry points exist and are executable',
    run: async () => {
      await assertExecutable(join('dist', 'cli-node.js'))
      await assertExecutable(join('dist', 'cli-bun.js'))
      await assertFile(join('dist', 'cli.js'))
    },
  },
  {
    name: 'vendored runtime assets exist',
    run: async () => {
      await assertFile(
        join('dist', 'vendor', 'ripgrep', `${process.arch}-${process.platform}`, 'rg'),
      )
    },
  },
]

let failed = 0
console.log('MiMo Code health check')
for (const check of checks) {
  try {
    await check.run()
    console.log(`OK   ${check.name}`)
  } catch (error) {
    failed++
    const message = error instanceof Error ? error.message : String(error)
    console.log(`FAIL ${check.name}: ${message}`)
  }
}

if (failed > 0) {
  console.log(`\n${failed} health check(s) failed.`)
  process.exit(1)
}

console.log('\nAll health checks passed.')

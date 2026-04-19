#!/usr/bin/env node
import { spawn } from 'node:child_process'

const targetPort = process.env.TUNNEL_PORT || '3000'
const maxBackoffMs = 30_000
let restartCount = 0
let stopping = false
let currentChild = null

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function log(msg) {
  const ts = new Date().toISOString()
  process.stdout.write(`[cloudflared-supervisor ${ts}] ${msg}\n`)
}

function relayStream(stream, writer) {
  stream.on('data', (chunk) => {
    writer.write(chunk)
    const text = String(chunk)
    const urlMatch = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/g)
    if (urlMatch?.length) {
      log(`active tunnel URL: ${urlMatch[0]}`)
    }
  })
}

function missingBinaryMessage() {
  log('cloudflared binary not found on PATH.')
  log('Install on macOS: brew install cloudflared')
  log('Then rerun: npm run tunnel:cloudflared')
}

async function runLoop() {
  while (!stopping) {
    log(`starting cloudflared for localhost:${targetPort}`)
    const child = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${targetPort}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: process.env,
    })
    currentChild = child
    relayStream(child.stdout, process.stdout)
    relayStream(child.stderr, process.stderr)

    const exitCode = await new Promise((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1))
      child.on('error', (err) => {
        if ((err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT')) {
          missingBinaryMessage()
        }
        resolve(1)
      })
    })
    currentChild = null
    if (stopping) break

    restartCount += 1
    const backoffMs = Math.min(1000 * (2 ** Math.min(restartCount, 5)), maxBackoffMs)
    log(`cloudflared exited with code ${exitCode}; restarting in ${Math.round(backoffMs / 1000)}s`)
    await sleep(backoffMs)
  }
}

function shutdown(signal) {
  if (stopping) return
  stopping = true
  log(`received ${signal}; shutting down`)
  if (currentChild && !currentChild.killed) {
    currentChild.kill('SIGTERM')
    setTimeout(() => {
      if (currentChild && !currentChild.killed) currentChild.kill('SIGKILL')
    }, 3000)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

runLoop().catch((err) => {
  log(`fatal error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

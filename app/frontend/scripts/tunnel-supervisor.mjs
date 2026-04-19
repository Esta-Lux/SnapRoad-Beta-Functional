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
  process.stdout.write(`[tunnel-supervisor ${ts}] ${msg}\n`)
}

function relayStream(stream, writer) {
  stream.on('data', (chunk) => {
    writer.write(chunk)
    const text = String(chunk)
    // Surface the current public URL prominently when tunnel reconnects.
    const urlMatch = text.match(/https?:\/\/[^\s]+\.tunnelmole\.net/g)
    if (urlMatch?.length) {
      const httpsUrl = urlMatch.find((u) => u.startsWith('https://')) || urlMatch[0]
      log(`active tunnel URL: ${httpsUrl}`)
    }
  })
}

async function runTunnelLoop() {
  while (!stopping) {
    log(`starting tunnelmole on localhost:${targetPort}`)
    const child = spawn('npx', ['tunnelmole', targetPort], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: process.env,
    })
    currentChild = child
    relayStream(child.stdout, process.stdout)
    relayStream(child.stderr, process.stderr)

    const exitCode = await new Promise((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1))
      child.on('error', () => resolve(1))
    })
    currentChild = null
    if (stopping) break

    restartCount += 1
    const backoffMs = Math.min(1000 * (2 ** Math.min(restartCount, 5)), maxBackoffMs)
    log(`tunnel exited with code ${exitCode}; restarting in ${Math.round(backoffMs / 1000)}s`)
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

runTunnelLoop().catch((err) => {
  log(`fatal supervisor error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

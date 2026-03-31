import fs from 'fs'
import path from 'path'
import { defineConfig, devices } from '@playwright/test'

/** Load app/frontend/.env.e2e into process.env (does not override existing env). */
function loadDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadDotEnvFile(path.join(process.cwd(), '.env.e2e'))

const port = 4173
const origin = `http://127.0.0.1:${port}`

// CI runs `npm run build` before e2e — preview serves dist/. Locally, dev server
// avoids "nothing listening on 4173" when dist/ is missing.
const webServerCommand = process.env.CI
  ? `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`
  : `npx vite --host 127.0.0.1 --port ${port} --strictPort`

const allBrowsers = process.env.E2E_ALL_BROWSERS === '1' || process.env.E2E_ALL_BROWSERS === 'true'

const projects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ...(allBrowsers
    ? [
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : []),
]

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'html',
  timeout: 60_000,
  use: {
    baseURL: origin,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects,
  webServer: {
    command: webServerCommand,
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

import { test, expect } from '@playwright/test'

const email = process.env.E2E_PARTNER_EMAIL
const password = process.env.E2E_PARTNER_PASSWORD
const hasApi =
  Boolean(process.env.VITE_API_URL) ||
  Boolean(process.env.VITE_BACKEND_URL) ||
  Boolean(process.env.REACT_APP_BACKEND_URL)
const liveLoginEnabled = process.env.E2E_LIVE_LOGIN === '1' || process.env.E2E_LIVE_LOGIN === 'true'

test.describe('partner login against live API', () => {
  test.skip(!liveLoginEnabled, 'Set E2E_LIVE_LOGIN=1 to run live partner login')
  test.skip(!email || !password, 'Set E2E_PARTNER_EMAIL and E2E_PARTNER_PASSWORD to run')
  test.skip(!hasApi, 'Set a staging API URL before running live partner login')

  test('reaches partner portal after sign-in', async ({ page }) => {
    await page.goto('/portal/partner/sign-in')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: /sign in to partner portal/i }).click()
    await expect(page.getByText('Partner Portal')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('nav-overview')).toBeVisible()
  })
})

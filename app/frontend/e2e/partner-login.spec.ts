import { test, expect } from '@playwright/test'

const email = process.env.E2E_PARTNER_EMAIL
const password = process.env.E2E_PARTNER_PASSWORD

test.describe('partner login against live API', () => {
  test.skip(!email || !password, 'Set E2E_PARTNER_EMAIL and E2E_PARTNER_PASSWORD to run')

  test('reaches partner portal after sign-in', async ({ page }) => {
    await page.goto('/auth?tab=partner')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: /^Sign in as Partner$/ }).click()
    await expect(page.getByText('Partner Portal')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('nav-overview')).toBeVisible()
  })
})

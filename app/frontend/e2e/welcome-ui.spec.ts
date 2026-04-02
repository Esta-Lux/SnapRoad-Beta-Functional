import { test, expect, type Page } from '@playwright/test'
import { gotoReady } from './utils/nav'

const goWelcome = (page: Page) => gotoReady(page, '/driver/auth')

test.describe('driver welcome landing', () => {
  test('Sign In opens auth modal', async ({ page }) => {
    await goWelcome(page)
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()
    await expect(page.getByPlaceholder('driver@example.com')).toBeVisible()
  })

  test('Start Driving opens signup mode in modal', async ({ page }) => {
    await goWelcome(page)
    await page.getByTestId('get-started-btn').click()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })
})

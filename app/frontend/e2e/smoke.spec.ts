import { test, expect } from '@playwright/test'

test.describe('launch smoke (admin SPA)', () => {
  test('document loads', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
  })
})

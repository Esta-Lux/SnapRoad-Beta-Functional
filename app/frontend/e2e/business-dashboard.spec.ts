import { test, expect } from '@playwright/test'

test.describe('business dashboard (mock partner UI)', () => {
  test.skip(Boolean(process.env.CI), 'Mock /business route is disabled in production builds')

  test('/business loads mock portal', async ({ page }) => {
    await page.goto('/business')
    await expect(page.getByText('Business Partner Portal')).toBeVisible()
    await expect(page.getByRole('heading', { name: /welcome, downtown coffee/i })).toBeVisible()
  })
})

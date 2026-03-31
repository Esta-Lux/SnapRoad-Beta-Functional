import { test, expect } from '@playwright/test'

test.describe('launch smoke (admin SPA)', () => {
  test('driver landing renders', async ({ page }) => {
    // `/` redirects to `/driver/auth`; assert real UI — `body` visibility is a poor signal
    // when the app throws during chunk load (e.g. split recharts + React).
    const response = await page.goto('/driver/auth', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()
    await expect(page.getByTestId('get-started-btn')).toBeVisible({ timeout: 15_000 })
  })
})

import { test, expect } from '@playwright/test'
import { gotoReady } from './utils/nav'

test.describe('partner and admin auth screens', () => {
  test('/auth redirects to partner welcome', async ({ page }) => {
    await gotoReady(page, '/auth')
    await expect(page).toHaveURL(/\/portal\/partner\/welcome/)
    await expect(page.getByRole('heading', { name: /your storefront/i })).toBeVisible()
  })

  test('/auth?tab=admin redirects to admin sign-in', async ({ page }) => {
    await gotoReady(page, '/auth?tab=admin')
    await expect(page).toHaveURL(/\/portal\/admin-sr2025secure\/sign-in/)
    await expect(page.getByRole('heading', { name: /admin sign in/i })).toBeVisible()
  })

  test('partner signup page renders', async ({ page }) => {
    await page.goto('/auth/partner-signup')
    await expect(page.getByRole('heading', { name: /partner with snaproad/i })).toBeVisible()
    await expect(page.getByPlaceholder('John')).toBeVisible()
  })

  test('partner sign-in links to partner signup', async ({ page }) => {
    await gotoReady(page, '/portal/partner/sign-in')
    await page.getByRole('link', { name: /create a partner account/i }).click()
    await expect(page).toHaveURL(/\/auth\/partner-signup/)
  })
})

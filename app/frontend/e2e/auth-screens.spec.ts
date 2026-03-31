import { test, expect } from '@playwright/test'

test.describe('partner and admin auth screens', () => {
  test('default auth page is partner tab with sign-in form', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('heading', { name: /welcome to snaproad/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Partner$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign in as Partner$/ })).toBeVisible()
  })

  test('admin tab shows admin sign-in', async ({ page }) => {
    await page.goto('/auth?tab=admin')
    await page.getByRole('button', { name: /^Admin$/ }).click()
    await expect(page.getByRole('button', { name: /^Sign in as Admin$/ })).toBeVisible()
  })

  test('partner signup page renders', async ({ page }) => {
    await page.goto('/auth/partner-signup')
    await expect(page.getByRole('heading', { name: /partner with snaproad/i })).toBeVisible()
    await expect(page.getByPlaceholder('John')).toBeVisible()
  })

  test('auth page link navigates to partner signup', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('button', { name: /create a partner account/i }).click()
    await expect(page).toHaveURL(/\/auth\/partner-signup/)
  })
})

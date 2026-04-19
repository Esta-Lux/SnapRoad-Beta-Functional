import { test, expect } from '@playwright/test'

/**
 * Requires a reachable API matching the built app (VITE_BACKEND_URL / proxy in dev).
 * CI: skip unless org secrets set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD and build uses staging API.
 */
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.describe('admin login against live API', () => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run')

  test('reaches admin console after sign-in', async ({ page }) => {
    await page.goto('/portal/admin-sr2025secure/sign-in')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: /sign in to admin/i }).click()
    await expect(page.getByText('Admin Console')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByRole('button', { name: /^Users & Families$/ })).toBeVisible()
  })
})

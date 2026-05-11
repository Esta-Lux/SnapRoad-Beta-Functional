import { test, expect } from '@playwright/test'
import { gotoReady } from './utils/nav'

test.describe('routing and auth guards', () => {
  test('root redirects to driver auth', async ({ page }) => {
    await gotoReady(page, '/')
    await expect(page).toHaveURL(/\/driver\/auth/)
  })

  test('unknown path falls through to driver auth', async ({ page }) => {
    await gotoReady(page, '/does-not-exist-xyz')
    await expect(page).toHaveURL(/\/driver\/auth/)
  })

  test('/preview falls through catch-all to driver auth', async ({ page }) => {
    await gotoReady(page, '/preview')
    await expect(page).toHaveURL(/\/driver\/auth/)
  })

  test('/login redirects to driver auth', async ({ page }) => {
    await gotoReady(page, '/login')
    await expect(page).toHaveURL(/\/driver\/auth/)
  })

  test('/partner redirects to partner portal then guard sends to partner welcome', async ({ page }) => {
    await gotoReady(page, '/partner')
    await expect(page).toHaveURL(/\/portal\/partner\/welcome/)
  })

  test('/admin redirects to admin portal path then guard sends to admin sign-in', async ({ page }) => {
    await gotoReady(page, '/admin')
    await expect(page).toHaveURL(/\/portal\/admin-sr2025secure\/sign-in/)
  })

  test('/portal/partner without session redirects to partner welcome', async ({ page }) => {
    await gotoReady(page, '/portal/partner')
    await expect(page).toHaveURL(/\/portal\/partner\/welcome/)
  })

  test('/portal/admin-sr2025secure without session redirects to admin sign-in', async ({ page }) => {
    await gotoReady(page, '/portal/admin-sr2025secure')
    await expect(page).toHaveURL(/\/portal\/admin-sr2025secure\/sign-in/)
  })

  test('/driver without session redirects to driver auth', async ({ page }) => {
    await gotoReady(page, '/driver')
    await expect(page).toHaveURL(/\/driver\/auth/)
  })

  test('/join redirects to partner signup', async ({ page }) => {
    await gotoReady(page, '/join')
    await expect(page).toHaveURL(/\/auth\/partner-signup/)
  })

  test('public legal routes render', async ({ page }) => {
    await gotoReady(page, '/privacy')
    await expect(page.getByTestId('legal-page-privacy')).toBeVisible()
    await gotoReady(page, '/terms')
    await expect(page.getByTestId('legal-page-terms')).toBeVisible()
    await gotoReady(page, '/community-guidelines')
    await expect(page.getByTestId('legal-page-community')).toBeVisible()
  })

  test('team scan without token shows invalid link', async ({ page }) => {
    await gotoReady(page, '/scan/demo-partner')
    await expect(page.getByRole('heading', { name: 'Invalid Link' })).toBeVisible()
  })

  test('team scan with partner id and token shows scanner shell', async ({ page }) => {
    await gotoReady(page, '/scan/demo-partner/e2e-test-token')
    await expect(page.getByRole('heading', { name: 'SnapRoad Scanner' })).toBeVisible()
    await expect(page.getByRole('button', { name: /open camera scanner/i })).toBeVisible()
  })
})

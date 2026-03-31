import type { Page } from '@playwright/test'

/** Default `load` waits for all resources; driver welcome uses a remote hero image that can stall CI. */
export function gotoReady(page: Page, path: string) {
  return page.goto(path, { waitUntil: 'domcontentloaded' })
}

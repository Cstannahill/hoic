import { test, expect } from '@playwright/test'

test('shows mobile bottom nav with correct tabs', async ({ page, isMobile }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'testpassword123')
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('**/')

  if (isMobile) {
    const nav = page.locator('nav.fixed.bottom-0')
    await expect(nav).toBeVisible()
    await expect(nav.getByText('Home')).toBeVisible()
    await expect(nav.getByText('Time')).toBeVisible()
  }
})

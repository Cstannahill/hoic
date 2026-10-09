import { test, expect } from '@playwright/test'

test('clock in and out loop', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'testpassword123')
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('**/')

  const clockInBtn = page.getByRole('button', { name: 'Clock In' })
  const clockOutBtn = page.getByRole('button', { name: 'Clock Out' })

  if (await clockInBtn.isVisible()) {
    // We are clocked out.
    // If there is a select for properties, we need to pick one if it's empty, but usually it selects first
    // Note: if there are NO properties, we might need to handle it.
    await clockInBtn.click()
    await expect(page.getByText('Saving...')).toBeVisible()
    await expect(clockOutBtn).toBeVisible({ timeout: 10000 })
  } else if (await clockOutBtn.isVisible()) {
    // We are clocked in
    await clockOutBtn.click()
    await expect(page.getByText('Saving...')).toBeVisible()
    await expect(clockInBtn).toBeVisible({ timeout: 10000 })
  }
})

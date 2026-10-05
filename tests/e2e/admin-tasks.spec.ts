import { test, expect } from '@playwright/test'

test('admin can view and create tasks', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'testpassword123')
  await page.click('button:has-text("Login")')
  await page.waitForURL('**/')

  await page.goto('/manage/tasks')


  await expect(page.getByRole('heading', { name: 'Manage Tasks' })).toBeVisible()
})

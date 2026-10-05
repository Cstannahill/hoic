import { test, expect } from '@playwright/test'

test('worker can request, claim, and purchase supplies', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'testpassword123')
  await page.click('button:has-text("Login")')
  await page.waitForURL('**/')

  await page.goto('/supplies')
  await expect(page.getByRole('heading', { name: 'Crew Supplies' })).toBeVisible()

  // 1. Request item
  await page.fill('input[name="description"]', 'Duct Tape')
  await page.selectOption('select[name="urgency"]', 'high')
  await page.click('button:has-text("Request")')

  // Wait for item to appear in Needed
  await expect(page.getByText('Duct Tape')).toBeVisible()
  
  // 2. Claim item
  const claimButton = page.locator('button:has-text("Claim to Buy")').first()
  await expect(claimButton).toBeVisible()
  await claimButton.click()

  // Wait for state transition to Claimed
  await expect(page.locator('button:has-text("Mark Purchased")').first()).toBeVisible()
  await expect(page.getByText('Claimed by Test')).toBeVisible()

  // 3. Purchase item
  const purchaseButton = page.locator('button:has-text("Mark Purchased")').first()
  await purchaseButton.click()

  // Wait for state transition to Purchased
  await expect(page.getByPlaceholder('Where is it?').first()).toBeVisible()

  // 4. Set stored location
  await page.click('button:has-text("Truck")')

  // Verify location is saved (the Save button will be disabled when value matches)
  const saveBtn = page.locator('button:has-text("Save")').first()
  await expect(saveBtn).toBeDisabled()
})

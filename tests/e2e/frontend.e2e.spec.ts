import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('can load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle('CAIT Bridal')
    await expect(page.getByRole('heading', { level: 1, name: 'Luxury, you can afford', exact: true }))
      .toBeVisible()
  })
})

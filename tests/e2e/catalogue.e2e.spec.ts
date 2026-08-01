import { expect, test } from '@playwright/test'

test.describe('Catalogue filters and cards', () => {
  test('supports desktop URL filters, empty state, and indexation policy', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await page.goto('http://localhost:3000/buy')

    await expect(page.getByRole('heading', { name: 'Filter dresses' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /size/i })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('SKU')

    await page.locator('#buy-desktop-price-max').fill('0')
    await page.getByRole('button', { name: 'Show dresses' }).click()

    await expect(page).toHaveURL(/\/buy\?priceMax=0(?:#catalogue-results)?$/)
    await expect(page.getByText('No dresses match these filters.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Remove filter Up to €0.00' })).toBeVisible()

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).not.toBeNull()
    expect(new URL(canonical ?? 'http://invalid').pathname).toBe('/buy')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex.*follow/i)
    expect(consoleErrors).toEqual([])
  })

  test('supports a keyboard-operated mobile filter drawer without overflow', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('http://localhost:3000/rent')

    const filterButton = page.getByRole('button', { name: 'Filters' })
    await filterButton.focus()
    await expect(filterButton).toBeFocused()
    await filterButton.press('Enter')

    const drawer = page.getByRole('dialog', { name: 'Filter dresses' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('checkbox', { name: /size/i })).toHaveCount(0)

    const closeButton = drawer.getByRole('button', { name: 'Close' })
    const closeBox = await closeButton.boundingBox()
    expect(closeBox?.width).toBeGreaterThanOrEqual(44)
    expect(closeBox?.height).toBeGreaterThanOrEqual(44)

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)

    await closeButton.press('Enter')
    await expect(drawer).toBeHidden()
    await expect(filterButton).toBeFocused()
  })
})

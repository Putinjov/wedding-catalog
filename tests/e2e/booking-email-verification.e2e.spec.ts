import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const baseUrl = process.env.DEVICE_TEST_BASE_URL ?? 'http://localhost:3000'

test('keeps email verification private and usable on desktop and mobile', async ({ page }) => {
  const response = await page.goto(`${baseUrl}/book-a-fitting/verify#token=example`)
  const cacheControl = response?.headers()['cache-control'] ?? ''
  if (process.env.DEVICE_TEST_EXPECT_PRODUCTION_HEADERS === 'true') {
    expect(cacheControl).toContain('no-store')
  } else {
    expect(cacheControl).toMatch(/no-store|no-cache/)
  }
  expect(response?.headers()['x-robots-tag']).toContain('noindex')
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page).toHaveURL(`${baseUrl}/book-a-fitting/verify`)

  const desktopViolations = (await new AxeBuilder({ page }).withTags([
    'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa',
  ]).analyze()).violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious')
  expect(desktopViolations).toEqual([])

  if (process.env.CAPTURE_BOOKING_SCREENSHOTS === 'true') {
    await page.screenshot({ path: 'docs/changes/repeat-booking-verification-desktop.png', fullPage: true })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const button = page.getByRole('button', { name: 'Confirm email' })
  const bounds = await button.boundingBox()
  expect(bounds?.width).toBeGreaterThanOrEqual(44)
  expect(bounds?.height).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)

  const mobileViolations = (await new AxeBuilder({ page }).withTags([
    'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa',
  ]).analyze()).violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious')
  expect(mobileViolations).toEqual([])

  if (process.env.CAPTURE_BOOKING_SCREENSHOTS === 'true') {
    await page.screenshot({ path: 'docs/changes/repeat-booking-verification-mobile.png', fullPage: true })
  }
})

test('captures the verification step in the fitting form', async ({ page }) => {
  test.skip(process.env.CAPTURE_BOOKING_SCREENSHOTS !== 'true')
  await page.goto(`${baseUrl}/book-a-fitting`)
  await page.getByRole('button', { name: 'Continue to date and time' }).click()
  const dates = page.locator('[role="grid"] button:not([disabled])')
  await expect(dates.first()).toBeVisible()

  let slotFound = false
  for (let index = 0; index < Math.min(await dates.count(), 12); index += 1) {
    await dates.nth(index).click()
    const slots = page.getByRole('group', { name: 'Fitting time' }).getByRole('button')
    await expect(page.getByRole('group', { name: 'Fitting time' })).not.toHaveAttribute('aria-busy', 'true')
    if (await slots.count()) {
      await slots.first().click()
      slotFound = true
      break
    }
  }
  expect(slotFound).toBe(true)
  await page.getByRole('button', { name: 'Continue to your details' }).click()
  await expect(page.getByRole('button', { name: 'Send verification link' })).toBeVisible()
  await page.screenshot({ path: 'docs/changes/repeat-booking-form-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'docs/changes/repeat-booking-form-mobile.png', fullPage: true })
})

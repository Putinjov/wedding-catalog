import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const testBaseUrl = process.env.DEVICE_TEST_BASE_URL ?? 'http://localhost:3000'

async function focusWithTab(page: Page, target: Locator, name: string, limit = 120) {
  for (let index = 0; index < limit; index += 1) {
    const focused = await target
      .evaluate((element) => element === document.activeElement)
      .catch(() => false)
    if (focused) return
    await page.keyboard.press('Tab')
  }

  throw new Error(`Could not reach ${name} after ${limit} Tab presses.`)
}

function seriousViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    .map((violation) => ({
      help: violation.help,
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    }))
}

async function expectMinimumTargetSize(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, 'Expected the touch target to have a rendered bounding box.').not.toBeNull()
  expect(box?.width).toBeGreaterThanOrEqual(44)
  expect(box?.height).toBeGreaterThanOrEqual(44)
}

test.describe('Booking accessibility', () => {
  test('has no serious or critical axe violations on the page and desktop dialog', async ({
    page,
  }) => {
    await page.goto(`${testBaseUrl}/book-a-fitting`)
    await expect(page.locator('form')).toBeVisible()

    const pageResults = await new AxeBuilder({ page }).withTags(wcagTags).analyze()
    expect(seriousViolations(pageResults.violations)).toEqual([])

    await page.setViewportSize({ height: 1000, width: 1440 })
    await page.goto(testBaseUrl)
    const dialogTrigger = page.getByRole('button', { exact: true, name: 'Book a fitting' })
    await dialogTrigger.scrollIntoViewIfNeeded()
    await dialogTrigger.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const dialogResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(wcagTags)
      .analyze()
    expect(seriousViolations(dialogResults.violations)).toEqual([])
  })

  test('supports keyboard-only booking navigation and validation without backend mutation', async ({
    page,
  }) => {
    await page.goto(`${testBaseUrl}/book-a-fitting`)

    const purposeContinue = page.getByRole('button', { name: 'Continue to date and time' })
    await focusWithTab(page, purposeContinue, 'the purpose Continue button')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Choose a date and time' })).toBeFocused()

    const detailsContinue = page.getByRole('button', { name: 'Continue to your details' })
    await focusWithTab(page, detailsContinue, 'the details Continue button')
    await page.keyboard.press('Enter')

    const dateGroup = page.getByRole('group', { name: 'Preferred date' })
    await expect(dateGroup).toBeFocused()
    await expect(dateGroup).toHaveAttribute('aria-describedby', /fitting-date-error/)
    await expect(page.locator('#fitting-date-error')).toHaveText('Please choose a date.')
    await expect(page).toHaveURL(/\/book-a-fitting/)
  })

  test('supports mobile touch targets, reduced motion, and 200% zoom-equivalent reflow', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(testBaseUrl)

    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()

    await page.goto(`${testBaseUrl}/book-a-fitting`)

    await expectMinimumTargetSize(
      page.getByRole('button', { name: /Explore dresses available to purchase/ }),
    )
    await expectMinimumTargetSize(
      page.getByRole('button', { name: /Explore dresses available to rent/ }),
    )
    await expectMinimumTargetSize(
      page.getByRole('button', { name: /Explore both options with guidance/ }),
    )
    await expectMinimumTargetSize(
      page.getByRole('button', { name: 'Continue to date and time' }),
    )

    await page.getByRole('button', { name: 'Continue to date and time' }).click()
    await expect(page.getByRole('heading', { name: 'Choose a date and time' })).toBeVisible()

    const unnecessaryAutoplay = page.locator('video[autoplay], audio[autoplay]')
    await expect(unnecessaryAutoplay).toHaveCount(0)
    const reducedMotionDuration = await page.locator('form').evaluate((form) => {
      const probe = form.querySelector('button')
      return probe ? getComputedStyle(probe).transitionDuration : null
    })
    expect(Number.parseFloat(reducedMotionDuration ?? '1')).toBeLessThanOrEqual(0.00001)

    const hasMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasMobileOverflow).toBe(false)

    await page.setViewportSize({ height: 900, width: 640 })
    const hasZoomEquivalentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasZoomEquivalentOverflow).toBe(false)
  })
})

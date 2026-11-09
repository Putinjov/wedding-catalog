import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const baseUrl = process.env.DEVICE_TEST_BASE_URL ?? 'http://localhost:3000'

for (const width of [1440, 390]) {
  test(`local fonts load without Google requests at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const externalFontRequests: string[] = []
    const fontResponses: number[] = []
    page.on('request', (request) => {
      if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())) {
        externalFontRequests.push(new URL(request.url()).hostname)
      }
    })
    page.on('response', (response) => {
      if (/\/_next\/static\/media\/[^/?]+\.woff2(?:\?|$)/.test(response.url())) {
        fontResponses.push(response.status())
      }
    })
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort())

    for (const [route, label] of [
      ['/', 'home'],
      ['/dresses', 'dresses'],
      ['/book-a-fitting', 'booking'],
    ]) {
      await page.goto(baseUrl + route)
      await expect(page.locator('h1')).toBeVisible()
      const fonts = await page.evaluate(async () => {
        await document.fonts.ready
        const heading = document.querySelector('h1')
        if (!heading) throw new Error('Heading missing')
        const bodyFamily = getComputedStyle(document.body).fontFamily.split(',')[0].trim()
        const headingFamily = getComputedStyle(heading).fontFamily.split(',')[0].trim()
        const sample = 'CÁIT ÀÉÍÓÚ Україна ҐЄІЇ'
        const faces = await Promise.all([
          document.fonts.load(`400 16px ${bodyFamily}`, sample),
          ...[400, 500, 600].map((weight) =>
            document.fonts.load(`${weight} 32px ${headingFamily}`, sample),
          ),
        ])
        return {
          bodyFamily,
          headingFamily,
          loaded: faces.map(
            (group) => group.length > 0 && group.every((face) => face.status === 'loaded'),
          ),
          fitsViewport: document.documentElement.scrollWidth <= window.innerWidth,
        }
      })
      expect(fonts.bodyFamily).not.toBe(fonts.headingFamily)
      expect(fonts.loaded).toEqual([true, true, true, true])
      expect(fonts.fitsViewport).toBe(true)
      const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect
        .soft(
          accessibility.violations
            .filter(({ impact }) => impact === 'serious' || impact === 'critical')
            .map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
            })),
        )
        .toEqual([])
      if (process.env.CAPTURE_FONT_SCREENSHOTS === 'true') {
        await page.screenshot({
          path: `docs/changes/font-build-${label}-${width}.png`,
          fullPage: true,
        })
      }
    }
    expect(externalFontRequests).toEqual([])
    expect(fontResponses.length).toBeGreaterThanOrEqual(4)
    expect(fontResponses.every((status) => status === 200)).toBe(true)
  })
}

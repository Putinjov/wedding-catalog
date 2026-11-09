import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import manifest from '@/assets/fonts/manifest.json'

const fontDirectory = resolve('src/assets/fonts')
const layout = readFileSync(resolve('src/app/(frontend)/layout.tsx'), 'utf8')

describe('self-hosted boutique fonts', () => {
  it('loads local fonts with the existing CSS variables, weights and swap behavior', () => {
    expect(layout).toContain("from 'next/font/local'")
    expect(layout).not.toContain('next/font/google')
    expect(layout).toContain("variable: '--font-body-sans'")
    expect(layout).toContain("variable: '--font-editorial-serif'")
    expect(layout.match(/display: 'swap'/g)).toHaveLength(2)
    expect(layout).toContain("adjustFontFallback: 'Times New Roman'")
    for (const font of manifest.fonts) {
      expect(layout).toContain(font.file)
      expect(layout).toContain(`weight: '${font.weight}'`)
    }
  })

  it('does not introduce another build-time Google font import', () => {
    const sourceFiles = readdirSync(resolve('src'), { recursive: true }).filter(
      (file): file is string => typeof file === 'string' && /\.[cm]?[jt]sx?$/.test(file),
    )
    for (const file of sourceFiles) {
      expect(readFileSync(resolve('src', file), 'utf8'), file).not.toMatch(
        /from\s+['"]next\/font\/google['"]/,
      )
    }
  })

  it.each(manifest.fonts)('ships the pinned, licensed WOFF2 asset $file', (font) => {
    const bytes = readFileSync(resolve(fontDirectory, font.file))
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('wOF2')
    expect(bytes.length).toBe(font.bytes)
    expect(bytes.readUInt32BE(8)).toBe(bytes.length)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(font.sha256)
    expect(font.source).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[a-f0-9]{40}\//,
    )
    const license = readFileSync(resolve(fontDirectory, font.license), 'utf8')
    expect(license).toContain('Copyright')
    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1')
  })
})

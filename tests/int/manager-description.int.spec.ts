import { describe, expect, it } from 'vitest'
import { emptyDescription, paragraph, replaceDescriptionNode } from '@/lib/manager/description'

describe('manager dress description', () => {
  it('creates Lexical-compatible formatted text nodes', () => {
    expect(paragraph('Text', 3)).toMatchObject({ type: 'paragraph', children: [{ type: 'text', text: 'Text', format: 3, version: 1 }] })
  })
  it('preserves unrelated existing nodes and root metadata', () => {
    const existing = { type: 'link', version: 1, fields: { url: 'https://example.com' } }
    const doc = emptyDescription()
    doc.root.children = [paragraph('Before'), existing]
    const updated = replaceDescriptionNode(doc, 0, paragraph('After'))
    expect(updated.root.children[1]).toBe(existing)
    expect(doc.root.children[0]).toEqual(paragraph('Before'))
    expect(updated.root.children[0]).toEqual(paragraph('After'))
  })
})

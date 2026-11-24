import type { Dress } from '@/payload-types'

export type Description = NonNullable<Dress['description']>
export type DescriptionNode = Description['root']['children'][number]

export function emptyDescription(): Description {
  return { root: { type: 'root', version: 1, children: [], direction: null, format: '', indent: 0 } }
}

export function paragraph(text = '', format = 0): DescriptionNode {
  return { type: 'paragraph', version: 1, direction: null, format: '', indent: 0, textFormat: 0, textStyle: '', children: [{ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' }] }
}

export function replaceDescriptionNode(value: Description, index: number, node: DescriptionNode): Description {
  return { ...value, root: { ...value.root, children: value.root.children.map((item, i) => i === index ? node : item) } }
}

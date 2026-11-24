'use client'

import { emptyDescription, paragraph, replaceDescriptionNode, type Description, type DescriptionNode } from '@/lib/manager/description'

function children(node: DescriptionNode): DescriptionNode[] {
  return Array.isArray(node.children) ? node.children as DescriptionNode[] : []
}

function preview(node: DescriptionNode): string {
  return typeof node.text === 'string' ? node.text : children(node).map(preview).join('')
}

export function DescriptionEditor({ value, onChange }: { value: Description | null; onChange: (value: Description) => void }) {
  const doc = value ?? emptyDescription()
  const nodes = doc.root.children
  function setNodes(next: DescriptionNode[]) { onChange({ ...doc, root: { ...doc.root, children: next } }) }
  return <section className="manager-editor" aria-label="Full description">
    <strong>Full description</strong>
    {nodes.map((node, index) => <div key={index} className="manager-panel">
      {node.type === 'paragraph' && children(node).every(child => child.type === 'text') ? <>
        {children(node).map((child, childIndex) => <div key={childIndex} className="manager-editor">
          <textarea aria-label={'Paragraph ' + (index + 1) + ' text ' + (childIndex + 1)} value={typeof child.text === 'string' ? child.text : ''} onChange={event => onChange(replaceDescriptionNode(doc, index, { ...node, children: children(node).map((item, i) => i === childIndex ? { ...item, text: event.target.value } : item) }))} />
          <div className="manager-pagination">{[[1,'Bold'],[2,'Italic'],[8,'Underline']].map(([mask, label]) => <button type="button" key={mask} aria-pressed={Boolean(Number(child.format ?? 0) & Number(mask))} onClick={() => onChange(replaceDescriptionNode(doc, index, { ...node, children: children(node).map((item, i) => i === childIndex ? { ...item, format: Number(item.format ?? 0) ^ Number(mask) } : item) }))}>{label}</button>)}</div>
        </div>)}
        <button type="button" onClick={() => onChange(replaceDescriptionNode(doc, index, { ...node, children: [...children(node), ...children(paragraph())] }))}>Add text segment</button>
      </> : <p>Existing formatted content (preserved): {preview(node) || node.type}</p>}
      <button type="button" onClick={() => { if (window.confirm('Remove this description block?')) setNodes(nodes.filter((_, i) => i !== index)) }}>Remove block</button>
    </div>)}
    <button type="button" onClick={() => setNodes([...nodes, paragraph()])}>Add paragraph</button>
  </section>
}

import type { Metadata } from 'next'
import Link from 'next/link'

import { siteConfig } from '@/config/site'
import {
  termsIntroduction,
  termsLastUpdated,
  termsSections,
  type TermsBlock,
} from '@/content/terms-and-conditions'

export const metadata: Metadata = {
  alternates: { canonical: '/terms-and-conditions' },
  description: `Terms and conditions for wedding dress purchases, rentals and related services at ${siteConfig.name}.`,
  title: 'Terms & Conditions',
}

function TermsBlocks({ blocks }: { blocks: TermsBlock[] }) {
  return blocks.map((block, index) => {
    if (block.type === 'list') {
      return (
        <ul key={index}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    }
    if (block.type === 'heading') return <h3 key={index}>{block.text}</h3>
    return (
      <p className="whitespace-pre-line" key={index}>
        {block.text}
      </p>
    )
  })
}

export default function TermsAndConditionsPage() {
  return (
    <main className="bg-background">
      <article className="container max-w-4xl py-16 md:py-24">
        <h1 className="font-serif text-4xl leading-tight text-foreground sm:text-6xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">Last updated: {termsLastUpdated}</p>
        <div className="prose prose-stone mt-12 max-w-none break-words prose-headings:font-serif prose-headings:font-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4">
          <TermsBlocks blocks={termsIntroduction} />
          {termsSections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <TermsBlocks blocks={section.blocks} />
            </section>
          ))}
          <p>
            <Link href="/contact">Contact CÁIT Bridal</Link> or read our{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </article>
    </main>
  )
}

import { Gem, Ruler, RefreshCw } from 'lucide-react'

const highlights = [
  {
    title: 'Curated collection',
    body: 'Handpicked gowns with refined silhouettes and considered detail.',
    icon: Gem,
  },
  {
    title: 'Personal fitting',
    body: 'Private appointments shaped around your ceremony and styling needs.',
    icon: Ruler,
  },
  {
    title: 'Buy or rent',
    body: 'Flexible options for keepsake gowns and short-term bridal rental.',
    icon: RefreshCw,
  },
]

export function ServiceHighlights() {
  return (
    <section className="border-y border-border bg-secondary/55">
      <div className="container grid gap-8 py-12 md:grid-cols-3">
        {highlights.map(({ body, icon: Icon, title }) => (
          <article className="flex gap-4" key={title}>
            <div className="flex size-11 shrink-0 items-center justify-center border border-border bg-background">
              <Icon className="size-5 text-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('go', go)

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return language !== 'plaintext'
        ? hljs.highlight(code, { language }).value
        : code
    },
  })
)

// Eager glob import — Vite bundles all markdown as string literals at build time.
// Add a file to content/ and it automatically appears in the sidebar on next build.
const rawDocs = import.meta.glob('../content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface DocEntry {
  slug: string
  title: string
  html: string
  order: number
  description?: string
}

interface Frontmatter {
  title?: string
  slug?: string
  order?: string
  description?: string
}

function parseFrontmatter(content: string): { meta: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }
  const meta: Frontmatter = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const k = line.slice(0, idx).trim() as keyof Frontmatter
    meta[k] = line.slice(idx + 1).trim()
  }
  return { meta, body: match[2] }
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

export const docs: DocEntry[] = Object.entries(rawDocs)
  .map(([path, raw]) => {
    const filename = path.split('/').pop()!.replace(/\.md$/, '')
    const { meta, body } = parseFrontmatter(raw)
    return {
      slug: meta.slug ?? filename,
      title: meta.title ?? extractTitle(body),
      html: marked(body) as string,
      order: meta.order ? parseInt(meta.order, 10) : 999,
      description: meta.description,
    }
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

export function getDocBySlug(slug: string): DocEntry | undefined {
  return docs.find((d) => d.slug === slug)
}

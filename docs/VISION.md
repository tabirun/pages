# Tabi Pages Vision

A static site generator for documentation and blog sites, built on Preact and
Deno.

## Core Principles

1. **Single rendering pipeline** - All content flows through the same path
2. **Markdown-first** - Optimized for docs/blogs with great code highlighting
3. **Preact for interactivity** - Layouts and pages hydrate for interactive UIs
4. **Simple over clever** - Minimal API surface, predictable behavior

## What It Does

- **File-based routing**: `pages/*.{md,tsx}` maps to URL paths
- **Nested layouts**: `_layout.tsx` files compose hierarchically by directory
- **Syntax highlighting**: Shiki-powered code blocks out of the box
- **Hot reload**: Fast development with file watching
- **Static build**: Production output is static HTML + JS bundles

## Page Types

| Type     | Extension | Use Case                          |
| -------- | --------- | --------------------------------- |
| Markdown | `.md`     | Content pages (docs, blog posts)  |
| TSX      | `.tsx`    | Interactive pages, custom layouts |

Both page types hydrate. Layouts are Preact components that may need
interactivity (nav toggles, theme switchers, etc.).

## Public API

```tsx
// Factory
import { pages } from "@tabirun/pages";

const { dev, build, serve } = pages({
  siteMetadata: { baseUrl: "https://example.com" },
});

// Development - registers middleware on app
await dev(app, { pagesDir: "./pages" });

// Production build - no app needed
await build({ pagesDir: "./pages", outDir: "./dist" });

// Serve static build - registers middleware on app
serve(app, { dir: "./dist" });
```

```tsx
// Components
import { Code } from "@tabirun/pages";

<Code lang="typescript">
  const greeting = "Hello";
</Code>;

// Hooks
import { useFrontmatter } from "@tabirun/pages";

const { title, description } = useFrontmatter();
```

## Architecture Overview

```
.md / .tsx page
      ↓
  Load + validate (frontmatter via Zod)
      ↓
  Compose with layouts
      ↓
  Render to HTML string
      ↓
  Extract <tabi-markdown> markers
      ↓
  Process markdown (GFM + Shiki)
      ↓
  Replace markers with processed HTML
      ↓
  Inject head content, hydration scripts
      ↓
  Final HTML
```

## Key Insight: Unified Markdown Pipeline

The `<Code>` component wraps content in markdown code fences and delegates to
`<Markdown>`:

````
<Code lang="ts">x</Code>
        ↓
<Markdown>{`\`\`\`ts\nx\n\`\`\``}</Markdown>
        ↓
<tabi-markdown>```ts
x
```</tabi-markdown>
        ↓
Post-process with Shiki
        ↓
<pre class="shiki">...</pre>
````

One marker type. One processor. Markdown pages and `<Code>` components use the
same path.

## Module Structure

```
@tabirun/pages/
├── markdown/       # Markdown processing + Shiki
├── preact/         # Compositor, Head, Context, Code component
├── scanner/        # File discovery
├── loaders/        # Page/layout loading + validation
├── bundler/        # esbuild abstraction
├── dev/            # Dev server + hot reload
├── build/          # Static site generation
├── core/           # Types, errors, config
└── mod.ts          # Public exports
```

## Non-Goals

- **Not a full-stack framework** - No API routes, no data fetching layer
- **Not a React framework** - Preact only, smaller footprint
- **Not infinitely configurable** - Sensible defaults, escape hatches when
  needed

## Inspiration

- **Astro**: Build-time markdown processing, Shiki integration
- **Next.js**: File-based routing, layouts

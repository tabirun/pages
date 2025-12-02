# Tabi Pages Implementation Plan

## Module Structure

```
packages/
├── pages/                    # Main package (@tabirun/pages)
│   ├── mod.ts               # Public exports
│   ├── core/                # Shared utilities
│   │   ├── types.ts         # All type definitions
│   │   ├── errors.ts        # Custom error classes
│   │   └── config.ts        # Configuration schemas (Zod)
│   │
│   ├── markdown/            # Markdown processing
│   │   ├── mod.ts           # Module exports
│   │   ├── shiki.ts         # Shiki singleton
│   │   ├── renderer.ts      # Markdown → HTML
│   │   └── extractor.ts     # Marker extraction + replacement
│   │
│   ├── preact/              # Preact components + utilities
│   │   ├── mod.ts           # Module exports
│   │   ├── code.tsx         # <Code> component (public)
│   │   ├── markdown.tsx     # <Markdown> component (internal)
│   │   ├── head.tsx         # <Head> component
│   │   ├── context.tsx      # FrontmatterProvider + hook
│   │   └── compositor.ts    # Layout composition
│   │
│   ├── scanner/             # File discovery
│   │   ├── mod.ts
│   │   ├── pages.ts         # Scan for .md/.tsx pages
│   │   ├── layouts.ts       # Scan for _layout.tsx
│   │   └── system.ts        # _html.tsx, _error.tsx, etc.
│   │
│   ├── loaders/             # File loading + validation
│   │   ├── mod.ts
│   │   ├── tsx.ts           # TSX page loader
│   │   ├── md.ts            # Markdown page loader
│   │   └── layout.ts        # Layout loader
│   │
│   ├── bundler/             # esbuild abstraction
│   │   ├── mod.ts
│   │   ├── entry.ts         # Entry point generation
│   │   ├── client.ts        # Client bundle building
│   │   └── ssr.ts           # SSR bundle execution
│   │
│   ├── renderer/            # Page rendering
│   │   ├── mod.ts
│   │   └── render.ts        # Orchestrates full render pipeline
│   │
│   ├── dev/                 # Development server
│   │   ├── mod.ts
│   │   ├── server.ts        # HTTP server + middleware
│   │   ├── watcher.ts       # File watching
│   │   └── hot-reload.ts    # WebSocket hot reload
│   │
│   └── build/               # Static build
│       ├── mod.ts
│       ├── builder.ts       # Build orchestration
│       ├── assets.ts        # Asset hashing
│       └── sitemap.ts       # Sitemap generation
```

## Implementation Order

### Phase 1: Core + Markdown

**Goal**: Standalone markdown processing that can render markdown with Shiki.

1. `core/types.ts` - Define all interfaces
2. `core/errors.ts` - Error classes
3. `markdown/shiki.ts` - Shiki singleton (idempotent init)
4. `markdown/renderer.ts` - Markdown → HTML with Shiki
5. `markdown/extractor.ts` - Find/replace `<tabi-markdown>` markers

**Test**: Render markdown string → HTML with syntax highlighting.

### Phase 2: Preact Components

**Goal**: `<Code>`, `<Markdown>`, `<Head>`, context hook.

1. `preact/context.tsx` - FrontmatterProvider + useFrontmatter
2. `preact/markdown.tsx` - Internal `<Markdown>` (renders marker)
3. `preact/code.tsx` - Public `<Code>` (wraps in fences, uses Markdown)
4. `preact/head.tsx` - `<Head>` component (renders marker)
5. `preact/compositor.ts` - Compose layouts around page

**Test**: Render component tree → HTML string with markers.

### Phase 3: Scanner + Loaders

**Goal**: Discover and load pages/layouts from filesystem.

1. `scanner/pages.ts` - Find .md/.tsx files
2. `scanner/layouts.ts` - Find _layout.tsx files
3. `scanner/system.ts` - Find _html.tsx, _error.tsx, _not-found.tsx
4. `loaders/tsx.ts` - Load + validate TSX pages
5. `loaders/md.ts` - Load + validate markdown pages
6. `loaders/layout.ts` - Load + validate layouts

**Test**: Given a pages directory, discover all pages and their layouts.

### Phase 4: Bundler

**Goal**: Generate entry points, build client bundles, execute SSR.

1. `bundler/entry.ts` - Generate hydration entry point code
2. `bundler/client.ts` - Build client bundle with esbuild
3. `bundler/ssr.ts` - Build + execute SSR bundle

**Test**: Given a page + layouts, produce client bundle + SSR HTML.

### Phase 5: Renderer

**Goal**: Full render pipeline from page file to final HTML.

1. `renderer/render.ts` - Orchestrate: load → compose → render → extract markers
   → process → inject head/scripts

**Test**: Given page path, produce complete HTML document.

### Phase 6: Dev Server

**Goal**: On-demand rendering with hot reload.

1. `dev/server.ts` - HTTP server with page middleware
2. `dev/watcher.ts` - File system watching
3. `dev/hot-reload.ts` - WebSocket reload

**Test**: Start server, edit file, see changes in browser.

### Phase 7: Static Build

**Goal**: Build entire site to static files.

1. `build/assets.ts` - Hash + copy public assets
2. `build/sitemap.ts` - Generate sitemap.xml
3. `build/builder.ts` - Orchestrate full build

**Test**: Build site, serve with static server, verify all pages work.

## Key Decisions Reference

| Decision                 | ADR                                              | Summary                                             |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------- |
| Single markdown pipeline | [001](docs/adr/001-unified-markdown-pipeline.md) | `<Code>` wraps in fences, delegates to `<Markdown>` |
| Marker extraction        | [002](docs/adr/002-marker-extraction-pattern.md) | `<tabi-markdown>` markers extracted post-render     |
| Universal hydration      | [003](docs/adr/003-universal-hydration.md)       | All pages hydrate (layouts need interactivity)      |

## Open Questions

1. **UnoCSS integration** - Include from start or add later?
2. **Static server** - Build our own or recommend existing (e.g., `deno serve`)?
3. **Error overlay** - Full error overlay or simplified approach?
4. **Default templates** - Ship default _html.tsx, _layout.tsx, _error.tsx?

## Dependencies

```json
{
  "preact": "^10.x",
  "preact-render-to-string": "^6.x",
  "@deno/gfm": "^0.11.x",
  "shiki": "^3.x",
  "esbuild": "^0.24.x",
  "zod": "^3.x"
}
```

# ADR 005: Client Bundle Architecture

## Status

Accepted

## Context

Pages need client-side JavaScript for hydration. Per ADR-003, all pages hydrate
(both markdown and TSX) because layouts commonly need interactivity.

Key questions:

1. What ships to the browser?
2. How is page data serialized?
3. How does hydration work?
4. How are bundles generated and served?

## Decision

### What Ships to the Browser

**For TSX pages:**

- Page component
- Layout components (full chain)
- Preact runtime
- User's client-side dependencies
- Serialized frontmatter

**For Markdown pages:**

- Layout components only (content already in HTML)
- Preact runtime
- Serialized frontmatter
- `<Markdown>` component (preserves innerHTML during hydration)

Markdown pages have smaller bundles - content doesn't ship twice.

### Data Serialization

Page data is serialized into a `<script>` tag in the HTML:

```html
<script id="__TABI_DATA__" type="application/json">
  {
    "frontmatter": { "title": "Hello", "description": "..." },
    "route": "/blog/post",
    "pageType": "markdown"
  }
</script>
```

This pattern (similar to Next.js `__NEXT_DATA__`) allows:

- Hydration without refetching data
- FrontmatterProvider initialization
- Future: serialized markdown cache (see markdown-hydration-cache.md plan)

### Hydration Entry Point

Generated for each page:

```tsx
// .tabi/entries/blog/post.client.tsx (generated)
import { hydrate } from "preact";
import { FrontmatterProvider } from "@tabirun/pages/preact";
import Layout0 from "../../pages/_layout.tsx";
import Layout1 from "../../pages/blog/_layout.tsx";

// Only for TSX pages:
import Page from "../../pages/blog/post.tsx";

// Read serialized data
const dataEl = document.getElementById("__TABI_DATA__");
const data = JSON.parse(dataEl!.textContent!);

function App() {
  return (
    <FrontmatterProvider frontmatter={data.frontmatter}>
      <Layout0>
        <Layout1>
          {data.pageType === "tsx" ? <Page /> : null}
          {/* Markdown content preserved in DOM by Markdown component */}
        </Layout1>
      </Layout0>
    </FrontmatterProvider>
  );
}

// Find hydration root
const root = document.getElementById("__tabi__");
hydrate(<App />, root!);
```

### HTML Document Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Head content from <Head> components -->
    <title>Page Title</title>
    <meta name="description" content="..." />
  </head>
  <body>
    <div id="__tabi__">
      <!-- SSR rendered content -->
      <nav>...</nav>
      <main>
        <div data-tabi-md="P0">
          <!-- Processed markdown HTML -->
        </div>
      </main>
    </div>

    <!-- Serialized page data -->
    <script id="__TABI_DATA__" type="application/json">
      {
        "frontmatter": { "title": "Hello" },
        "route": "/blog/post",
        "pageType": "markdown"
      }
    </script>

    <!-- Client bundle -->
    <script type="module" src="/_tabi/blog/post-a1b2c3.js"></script>
  </body>
</html>
```

### esbuild Configuration

```ts
const clientConfig: esbuild.BuildOptions = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020", "chrome80", "firefox80", "safari14"],
  jsx: "automatic",
  jsxImportSource: "preact",
  treeShaking: true,
  // Dev vs Prod differences:
  minify: production,
  sourcemap: production ? false : "inline",
  entryNames: production ? "[name]-[hash]" : "[name]",
};
```

### Bundle Output

**Development:**

```
.tabi/client/
└── blog/
    └── post.js          # Unminified, inline sourcemaps
```

Served at `/_tabi/blog/post.js`

**Production:**

```
dist/
├── blog/
│   └── post/
│       └── index.html
└── _tabi/
    └── blog/
        └── post-a1b2c3.js  # Minified, hashed
```

### Markdown Hydration

For markdown pages, content is already rendered to HTML. The `<Markdown>`
component preserves this during hydration:

```tsx
// Simplified - see preact/markdown.tsx for actual implementation
function Markdown({ children }) {
  const id = useId();
  const isServer = typeof window === "undefined";

  if (isServer) {
    // Render marker for post-processing
    return <div data-tabi-md={id}>...</div>;
  }

  // Client: preserve existing innerHTML
  const el = document.querySelector(`[data-tabi-md="${id}"]`);
  return (
    <div
      data-tabi-md={id}
      dangerouslySetInnerHTML={{ __html: el?.innerHTML ?? "" }}
    />
  );
}
```

Future improvement: serialize processed HTML into `__TABI_DATA__` to avoid DOM
queries. See `docs/plans/markdown-hydration-cache.md`.

### Code Splitting (Future)

Initial implementation: one bundle per page.

Future optimization: extract shared code into common chunks.

```
dist/_tabi/
├── common-[hash].js     # Preact, shared layouts
├── blog/
│   └── post-[hash].js   # Page-specific code
└── about-[hash].js
```

This reduces total download size when navigating between pages.

## Consequences

### Positive

- **Fast hydration** - Data already in page, no fetch required
- **Small markdown bundles** - Content doesn't ship twice
- **Standard patterns** - Similar to Next.js, familiar to developers
- **Cache-friendly** - Hashed filenames in production

### Negative

- **JavaScript required** - No progressive enhancement (acceptable for
  docs/blogs)
- **Bundle per page** - No shared chunks initially
- **Inline data** - Increases HTML size (typically small)

### Neutral

- **No streaming** - Full HTML rendered before sending (can optimize later)

## Alternatives Considered

### 1. Islands architecture (like Astro)

More complex, requires marking interactive components. Overkill for layouts that
are inherently interactive.

### 2. No hydration for markdown

Layouts wouldn't be interactive. Unacceptable for nav, theme switchers, etc.

### 3. Fetch data on client

Slower, requires API endpoint, flashes of loading state.

### 4. External Preact (CDN)

Adds external dependency, potential availability issues. Bundling is more
reliable.

## Related

- ADR-003: Universal Hydration
- ADR-004: SSR Bundling Strategy
- Plan: markdown-hydration-cache.md

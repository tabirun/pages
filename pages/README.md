# pages

Factory function for creating a static site generator instance.

## Installation

```typescript
import { pages } from "@tabirun/pages";
```

## Usage

```typescript
const { dev, build, serve } = pages({
  siteMetadata: { baseUrl: "https://example.com" },
  markdown: { wrapperClassName: "prose" },
});

// Development server with hot reload (returns handle for cleanup)
const handle = await dev(app, { pagesDir: "./pages" });
// handle.stop() to stop the watcher

// Production build
await build({ pagesDir: "./pages", outDir: "./dist" });

// Serve static build
serve(app, { dir: "./dist" });
```

## Options

### PagesConfig

| Option         | Type              | Description                                          |
| -------------- | ----------------- | ---------------------------------------------------- |
| `basePath`     | `string`          | URL prefix for all routes (e.g., "/docs")            |
| `shikiTheme`   | `string`          | Shiki theme for code blocks (default: "github-dark") |
| `siteMetadata` | `SiteMetadata`    | Enables sitemap.xml generation                       |
| `markdown`     | `MarkdownOptions` | Markdown rendering options                           |

### MarkdownOptions

| Option             | Type     | Description                                                 |
| ------------------ | -------- | ----------------------------------------------------------- |
| `wrapperClassName` | `string` | CSS class(es) for markdown wrapper (e.g., "prose prose-lg") |

### SiteMetadata

| Option    | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `baseUrl` | `string` | Site base URL (must be valid) |

### DevOptions

| Option     | Type     | Default     | Description          |
| ---------- | -------- | ----------- | -------------------- |
| `pagesDir` | `string` | `"./pages"` | Directory with pages |

### BuildOptions

| Option     | Type     | Default     | Description          |
| ---------- | -------- | ----------- | -------------------- |
| `pagesDir` | `string` | `"./pages"` | Directory with pages |
| `outDir`   | `string` | `"./dist"`  | Output directory     |

### ServeOptions

| Option | Type     | Default    | Description        |
| ------ | -------- | ---------- | ------------------ |
| `dir`  | `string` | `"./dist"` | Directory to serve |

## Notes

- File-based routing: `pages/*.{md,tsx}` maps to URL paths
- Nested layouts via `_layout.tsx` files
- Markdown pages use GFM with Shiki syntax highlighting

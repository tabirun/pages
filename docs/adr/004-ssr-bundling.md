# ADR 004: SSR Bundling Strategy

## Status

Accepted

## Context

### The Problem: Deno Module Cache in Dev Mode

Deno caches dynamic imports. Once a module is imported, subsequent `import()`
calls return the cached version even if the file changed on disk.

For framework-controlled imports, we can add cache-busting:

```ts
// Framework controls this import site
const layout = await import(`file://${layoutPath}?t=${Date.now()}`);
```

But user code imports user code with static paths:

```tsx
// pages/_layout.tsx
import { Header } from "../components/header.tsx";
import { useTheme } from "../hooks/use-theme.ts";

export default function Layout({ children }) {
  return (
    <html>
      <Header />
      {children}
    </html>
  );
}
```

Cache-busting `_layout.tsx` doesn't help - when we import the fresh layout, it
still contains its original static imports. If `Header` changed, we get stale
code.

### Constraints

- Can't modify user import statements
- Deno doesn't support runtime import map modification
- `--reload` flag only works for CLI, not programmatic imports
- Need fast iteration in dev mode

## Decision

**Use esbuild to bundle user code for SSR in dev mode.**

Each page render bundles: page component + layouts + all user dependencies into
a single JS file. This file is then imported by the framework.

```
File change detected
        ↓
esbuild bundles: page + layouts + user imports
        ↓
In-memory bundle (no disk I/O)
        ↓
Import via data URL
        ↓
Render to HTML
```

### What Gets Bundled

**Included in SSR bundle:**

- Page component (TSX) or content reference (markdown)
- Layout components (`_layout.tsx` chain)
- User's local imports (components, hooks, utilities)

**Excluded (external):**

- Framework modules (`@tabirun/pages/*`) - resolved at runtime
- npm dependencies (`preact`, `zod`) - resolved at runtime
- Built-in modules - resolved at runtime

Externals keep bundles small and fast to generate.

### Entry Point Generation

For each page, generate an SSR entry point as a string (not written to disk):

```tsx
// Generated in-memory for TSX pages
export { default as Layout0 } from "/abs/path/pages/_layout.tsx";
export { default as Layout1 } from "/abs/path/pages/blog/_layout.tsx";
export { default as Page, frontmatter } from "/abs/path/pages/blog/post.tsx";
```

For markdown pages:

```tsx
// Generated in-memory for markdown pages
export { default as Layout0 } from "/abs/path/pages/_layout.tsx";
export { default as Layout1 } from "/abs/path/pages/blog/_layout.tsx";
export const frontmatter = { title: "Hello", description: "..." };
export const markdownContent = `# Hello\n\nPost content...`;
```

Entry points use absolute paths so esbuild can resolve imports correctly.

### esbuild Configuration

```ts
const ssrConfig: esbuild.BuildOptions = {
  bundle: true,
  write: false, // Return in-memory, don't write to disk
  format: "esm",
  platform: "node",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "preact",
  sourcemap: "inline", // Inline for data URL import
  minify: false, // Readable errors in dev
  treeShaking: true,
  external: [
    "@tabirun/*",
    "preact",
    "preact/*",
    "preact-render-to-string",
    "zod",
    // Other npm dependencies
  ],
};
```

### In-Memory Import Strategy

Bundle output is imported via data URL, avoiding the file system entirely:

```ts
async function importSSRBundle(page: PageEntry): Promise<SSRModule> {
  const entryCode = generateEntryPoint(page);

  const result = await esbuild.build({
    ...ssrConfig,
    stdin: {
      contents: entryCode,
      resolveDir: projectRoot,
      loader: "tsx",
    },
  });

  const code = result.outputFiles[0].text;
  const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
  return await import(dataUrl);
}
```

### Performance Optimizations

Bundling on every request would be slow. Mitigations:

1. **Content-based caching** - Cache bundles keyed by hash of source files
2. **Incremental builds** - esbuild reuses AST from previous builds
3. **Lazy bundling** - Bundle on first request, not at startup
4. **Watcher integration** - Invalidate cache when files change

```ts
interface CachedBundle {
  hash: string;
  module: SSRModule;
}

const bundleCache = new Map<string, CachedBundle>();

async function getSSRBundle(page: PageEntry): Promise<SSRModule> {
  const hash = await hashSourceFiles(page);
  const cached = bundleCache.get(page.route);

  if (cached?.hash === hash) {
    return cached.module;
  }

  const module = await importSSRBundle(page);
  bundleCache.set(page.route, { hash, module });
  return module;
}
```

### Why In-Memory?

- **Faster** - No disk I/O
- **Cleaner** - No temp files to manage or clean up
- **Simpler** - No directory creation, permissions, or `.gitignore` entries
- **Auto-cleanup** - Process exit clears everything

### Production Build

For `build()`, SSR bundling is optional since there's no caching issue in a
one-shot process. Options:

1. **Use Deno imports directly** - Simpler, no bundle step
2. **Use esbuild for consistency** - Same code path as dev

Recommendation: Use Deno imports for production SSR (simpler), but the bundler
module supports both modes.

## Consequences

### Positive

- **Solves module caching** - Fresh bundle = fresh code
- **Fast** - esbuild is extremely fast (~10ms for typical page)
- **Source maps** - Stack traces point to original files
- **No user code changes** - Works with existing imports

### Negative

- **Added complexity** - Entry generation, cache management
- **esbuild dependency** - Must be installed
- **Cold start latency** - First request bundles (mitigated by lazy loading)

### Neutral

- **Different dev/prod paths** - Acceptable given the constraints

## Alternatives Considered

### 1. Force users to use dynamic imports

Requires rewriting user code. Unacceptable DX.

### 2. Custom Deno loader

Deno doesn't support pluggable loaders. Would require forking.

### 3. File watcher that rewrites imports

Fragile, would break source maps, complex to implement correctly.

### 4. Accept stale code in dev

Terrible DX. Changes wouldn't reflect without restart.

## Related

- ADR-005: Client Bundle Architecture (browser-side bundling)

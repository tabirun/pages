# Bundler Module Plan

## Purpose

Generate client-side JavaScript bundles for page hydration using esbuild. This
enables interactive layouts and TSX pages per ADR-003 (Universal Hydration) and
ADR-005 (Client Bundle Architecture).

## Dependencies

- `npm:esbuild` - Fast JavaScript bundler
- `jsr:@luca/esbuild-deno-loader` - Deno import resolution for esbuild
- `loaders/mod.ts` - Types (LoadedPage, LoadedLayout)
- `preact/mod.ts` - Client components (FrontmatterProvider, Markdown)

## Architecture

### Entry Code Generation

For each page, generate a virtual entry file that:

1. Imports `hydrate` from Preact
2. Imports `FrontmatterProvider` (and `Markdown` for markdown pages)
3. Imports all layouts in the chain
4. Imports the page component (TSX pages only)
5. Reads page data from `__TABI_DATA__` script
6. Composes the component tree matching server-side composition
7. Hydrates into `__tabi__` root element

**TSX Page Entry:**

```tsx
import { hydrate } from "preact";
import { FrontmatterProvider } from "file:///project/preact/mod.ts";
import Layout0 from "file:///project/pages/_layout.tsx";
import Layout1 from "file:///project/pages/blog/_layout.tsx";
import Page from "file:///project/pages/blog/post.tsx";

const dataEl = document.getElementById("__TABI_DATA__");
const data = JSON.parse(dataEl?.textContent ?? "{}");

function App() {
  return (
    <FrontmatterProvider value={data.frontmatter}>
      <Layout0>
        <Layout1>
          <Page />
        </Layout1>
      </Layout0>
    </FrontmatterProvider>
  );
}

hydrate(<App />, document.getElementById("__tabi__"));
```

**Markdown Page Entry:**

```tsx
import { hydrate } from "preact";
import { FrontmatterProvider, Markdown } from "file:///project/preact/mod.ts";
import Layout0 from "file:///project/pages/_layout.tsx";

const dataEl = document.getElementById("__TABI_DATA__");
const data = JSON.parse(dataEl?.textContent ?? "{}");

function App() {
  return (
    <FrontmatterProvider value={data.frontmatter}>
      <Layout0>
        <Markdown />
      </Layout0>
    </FrontmatterProvider>
  );
}

hydrate(<App />, document.getElementById("__tabi__"));
```

Markdown pages use `<Markdown />` which reads preserved content from DOM during
hydration. Content doesn't ship twice.

**No Layouts:**

```tsx
function App() {
  return (
    <FrontmatterProvider value={data.frontmatter}>
      <Page /> {/* or <Markdown /> */}
    </FrontmatterProvider>
  );
}
```

### esbuild Configuration

```ts
const clientConfig: esbuild.BuildOptions = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020", "chrome90", "firefox90", "safari15"],
  jsx: "automatic",
  jsxImportSource: "preact",
  treeShaking: true,
  // Mode-specific:
  minify: mode === "production",
  sourcemap: mode === "development" ? "inline" : false,
  entryNames: mode === "production" ? "[name]-[hash]" : "[name]",
  // Deno resolution:
  plugins: [denoLoaderPlugin()],
};
```

### Output Structure

**Development:**

```
.tabi/
└── client/
    ├── index.js
    ├── about.js
    └── blog/
        └── post.js
```

Served at `/_tabi/index.js`, `/_tabi/about.js`, etc.

**Production:**

```
dist/
└── _tabi/
    ├── index-a1b2c3d4.js
    ├── about-e5f6g7h8.js
    └── blog/
        └── post-i9j0k1l2.js
```

Content-hashed filenames for cache busting.

## API

```ts
// bundler/types.ts

interface BundleClientOptions {
  /** Loaded page to bundle. */
  page: LoadedPage;
  /** Layout chain from root to innermost. */
  layouts: LoadedLayout[];
  /** Route path (e.g., "/blog/post"). */
  route: string;
  /** Output directory for bundles. */
  outDir: string;
  /** Build mode. */
  mode: "development" | "production";
  /** Project root for resolving imports. */
  projectRoot: string;
}

interface BundleClientResult {
  /** Absolute path to output bundle file. */
  outputPath: string;
  /** URL path for script src (e.g., "/_tabi/blog/post.js"). */
  publicPath: string;
  /** Content hash (production only). */
  hash?: string;
}

class BundleError extends Error {
  name = "BundleError";
  constructor(
    message: string,
    public readonly route: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// bundler/client.ts

/**
 * Bundle a page for client-side hydration.
 *
 * @param options - Bundle configuration
 * @returns Bundle output paths and hash
 * @throws {BundleError} If bundling fails
 */
async function bundleClient(
  options: BundleClientOptions,
): Promise<BundleClientResult>;

// bundler/entry.ts (internal)

/**
 * Generate client entry code for a page.
 * @internal
 */
function generateClientEntry(
  page: LoadedPage,
  layouts: LoadedLayout[],
  projectRoot: string,
): string;
```

## Route to Bundle Path Mapping

```
Route              Dev Bundle Path           Prod Bundle Path
/                  /_tabi/index.js           /_tabi/index-[hash].js
/about             /_tabi/about.js           /_tabi/about-[hash].js
/blog/post         /_tabi/blog/post.js       /_tabi/blog/post-[hash].js
/docs/api/client   /_tabi/docs/api/client.js /_tabi/docs/api/client-[hash].js
```

## Error Handling

- Entry generation errors: Invalid page/layout structure
- esbuild errors: Syntax errors, missing imports, resolution failures
- File system errors: Can't write output

All wrapped in `BundleError` with route context.

## Testing Strategy

1. **Entry generation tests** - Verify correct code generation for:
   - TSX pages with/without layouts
   - Markdown pages with/without layouts
   - Multiple nested layouts
   - Edge cases (empty frontmatter, special characters)

2. **Bundle integration tests** - Verify esbuild produces valid output:
   - Development mode (unminified, sourcemaps)
   - Production mode (minified, hashed)
   - Imports resolve correctly

3. **Error handling tests** - Verify proper errors for:
   - Invalid page types
   - Missing imports in user code
   - File system failures

## Commits

1. **Types and interfaces** - BundleClientOptions, BundleClientResult,
   BundleError
2. **Entry code generation** - generateClientEntry for TSX and markdown pages
3. **esbuild integration** - bundleClient with Deno loader plugin
4. **Content hashing** - Production mode with hashed filenames
5. **Module exports** - mod.ts with public API
6. **Documentation** - README with usage examples

## Future Enhancements

### Code Splitting (deferred)

Extract shared code into common chunks:

```
dist/_tabi/
├── common-[hash].js     # Preact, shared layouts
├── blog/
│   └── post-[hash].js   # Page-specific
└── about-[hash].js
```

### SSR Bundling (ADR-004)

For dev mode cache-busting, bundle SSR code to solve Deno's module caching. This
is a dev server optimization, not required for initial functionality.

## Related

- ADR-003: Universal Hydration
- ADR-004: SSR Bundling Strategy
- ADR-005: Client Bundle Architecture
- Plan: markdown-hydration-cache.md (unblocked by this work)

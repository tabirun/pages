# Plan: Base Path Support

## Overview

Add support for configuring a base path so apps can be hosted at a custom path
prefix (e.g., `/docs/` instead of `/`).

## Design Decisions

See [ADR-007: Base Path Strategy](../adr/007-base-path-strategy.md) for full
rationale.

**Summary:** Fully explicit basePath - users handle all URL prefixing, build
system only does asset hashing.

## Configuration

### Schema

```typescript
// pages/config.ts
export const PagesConfigSchema = z.object({
  basePath: z
    .string()
    .regex(
      /^(\/[a-z0-9-]+)*$/,
      "basePath must be empty or contain segments of lowercase alphanumeric and hyphens",
    )
    .optional()
    .default(""),
  siteMetadata: SiteMetadataSchema.optional(),
});
```

### Usage

```typescript
const { build, serve } = pages({
  basePath: "/docs",
  siteMetadata: { baseUrl: "https://example.com" },
});
```

### Normalization

- Leading slash required (except empty string for root)
- No trailing slash
- Empty string `""` means root (no prefix)
- Validation: lowercase alphanumeric and hyphens only

## Implementation

### Phase 1: Configuration

**Files:**

- `pages/config.ts` - Add basePath to schema
- `pages/types.ts` - Types inferred from schema
- `pages/factory.ts` - Pass basePath to build/serve

### Phase 2: Build - System-injected paths

These are paths the user never writes - the build system generates them.

**File: `bundler/client.ts`**

```typescript
// Line 103 - currently:
const publicPath = `/_tabi/${outputFileName}`;

// Change to:
const publicPath = `${basePath}/_tabi/${outputFileName}`;
```

**File: `unocss/compiler.ts`**

```typescript
// Line 95 - currently:
publicPath: `/${STYLES_DIR}/${filename}`,

// Change to:
publicPath: `${basePath}/${STYLES_DIR}/${filename}`,

// Update VALID_CSS_PATH_PATTERN to accept basePath prefix
```

**File: `build/builder.ts`**

- Accept basePath in BuildSiteOptions
- Pass basePath to bundleClient()
- Pass basePath to compileUnoCSS()
- Pass basePath to asset map creation
- Pass basePath to CSS rewriter

**File: `build/types.ts`**

```typescript
export interface BuildSiteOptions {
  // ... existing
  basePath?: string;
}
```

### Phase 3: Asset Map with basePath

The asset map keys and values both include basePath, matching what users write.

**File: `build/assets.ts`**

Update `createAssetMap()` to prefix keys and values:

```typescript
export function createAssetMap(
  assets: BuildAssetResult[],
  basePath: string = "",
): Map<string, string> {
  const map = new Map<string, string>();
  for (const asset of assets) {
    if (asset.wasHashed) {
      // Both key and value include basePath
      map.set(
        `${basePath}${asset.originalPath}`,
        `${basePath}${asset.hashedPath}`,
      );
    }
  }
  return map;
}
```

### Phase 4: HTML Rewriter

The HTML rewriter does simple asset map lookup - no basePath logic needed since
the map already contains basePath-prefixed paths.

**File: `build/html-rewriter.ts`**

No changes to the rewriting logic. The existing implementation already does map
lookup:

```typescript
// Existing logic works as-is
const hashedPath = assetMap.get(path);
return `src=${quote}${hashedPath ?? path}${quote}`;
```

With basePath in the asset map:

- Input: `<img src="/docs/logo.png">`
- Map lookup: `/docs/logo.png` → `/docs/logo-HASH.png`
- Output: `<img src="/docs/logo-HASH.png">`

### Phase 5: CSS Rewriter (new file)

Process CSS files in output directory for asset hashing.

**File: `build/css-rewriter.ts`**

```typescript
/**
 * Rewrite url() values in CSS using asset map.
 *
 * Users must include basePath in their CSS paths.
 * We only apply content hashes from the asset map.
 */
export function rewriteCssUrls(
  css: string,
  assetMap: Map<string, string>,
): string {
  if (assetMap.size === 0) {
    return css;
  }

  return css.replace(
    /\burl\((['"]?)([^'")]+)\1\)/g,
    (match, quote, path) => {
      const hashedPath = assetMap.get(path);
      return hashedPath ? `url(${quote}${hashedPath}${quote})` : match;
    },
  );
}
```

**Integration in `build/builder.ts`:**

```typescript
// After HTML rewriting, process CSS files in output
const cssFiles = await glob("**/*.css", { cwd: outDir });
for (const cssFile of cssFiles) {
  const cssPath = join(outDir, cssFile);
  const css = await Deno.readTextFile(cssPath);
  const rewritten = rewriteCssUrls(css, assetMap);
  await Deno.writeTextFile(cssPath, rewritten);
}
```

### Phase 6: Serve - basePath stripping

**File: `serve/types.ts`**

```typescript
export interface StaticServerOptions {
  rootDir?: string;
  basePath?: string;
}
```

**File: `serve/server.ts`**

Strip basePath from incoming requests:

```typescript
export function registerStaticServer(
  app: TabiApp,
  options: StaticServerOptions = {}
): void {
  const rootDir = options.rootDir ?? "./";
  const basePath = options.basePath ?? "";

  // Load _not-found.html...

  app.get("/*", (c, next) => {
    const pathname = new URL(c.req.url).pathname;

    if (basePath) {
      // Must start with basePath
      if (!pathname.startsWith(basePath)) {
        if (notFoundHtml) {
          return c.html(notFoundHtml, 404);
        }
        return c.notFound();
      }

      // Strip basePath for file lookup
      const strippedPath = pathname.slice(basePath.length) || "/";
      // Rewrite URL for downstream handler
      // (implementation depends on Tabi framework)
    }

    return next();
  });

  app.get("/*", serveFiles({ ... }));
}
```

### Phase 7: Runtime basePath access

Provide basePath via Preact context for use in components.

**File: `renderer/serialize.ts`**

Add basePath to `__TABI_DATA__`:

```typescript
export interface SerializedPageData {
  // ... existing
  basePath: string;
}
```

**File: `preact/context/base-path.tsx` (new)**

```tsx
import { createContext } from "preact";
import { useContext } from "preact/hooks";

const BasePathContext = createContext<string>("");

export interface BasePathProviderProps {
  basePath: string;
  children: preact.ComponentChildren;
}

export function BasePathProvider(
  { basePath, children }: BasePathProviderProps,
) {
  return (
    <BasePathContext.Provider value={basePath}>
      {children}
    </BasePathContext.Provider>
  );
}

/**
 * Get the configured basePath from context.
 * Must be used within a component tree wrapped by BasePathProvider.
 */
export function useBasePath(): string {
  return useContext(BasePathContext);
}
```

**Integration:**

The renderer wraps the page component tree with `BasePathProvider`:

```tsx
// In renderer or hydration entry
<BasePathProvider basePath={pageData.basePath}>
  <Layout>
    <Page />
  </Layout>
</BasePathProvider>;
```

**Usage:**

```tsx
import { useBasePath } from "@tabirun/pages";

function MyComponent() {
  const basePath = useBasePath();
  return <a href={`${basePath}/about`}>About</a>;
}
```

**Note:** CSS and markdown cannot use the context - users must hardcode basePath
in those contexts.

## File Changes Summary

| File                           | Change                            |
| ------------------------------ | --------------------------------- |
| `pages/config.ts`              | Add basePath to schema            |
| `pages/factory.ts`             | Pass basePath to build/serve      |
| `build/types.ts`               | Add basePath to BuildSiteOptions  |
| `build/builder.ts`             | Wire basePath through pipeline    |
| `build/assets.ts`              | Prefix asset map keys/values      |
| `build/css-rewriter.ts`        | **NEW** - Rewrite url() in CSS    |
| `bundler/client.ts`            | Prefix bundle public paths        |
| `bundler/entry.ts`             | Wrap with BasePathProvider        |
| `unocss/compiler.ts`           | Prefix stylesheet paths           |
| `serve/types.ts`               | Add basePath option               |
| `serve/server.ts`              | Strip basePath from requests      |
| `renderer/serialize.ts`        | Include basePath in page data     |
| `renderer/renderer.tsx`        | Wrap with BasePathProvider        |
| `preact/context/base-path.tsx` | **NEW** - Context and useBasePath |

## Testing Strategy

### Unit tests

1. **Configuration validation**

   - Valid: `""`, `"/docs"`, `"/my-app"`, `"/docs/v2"`
   - Invalid: `"docs"`, `"/docs/"`, `"/Docs"`

2. **Asset map creation**

   - Keys and values include basePath
   - Empty basePath works (current behavior)

3. **CSS rewriter**

   - Paths in asset map get hashed
   - Paths not in map unchanged
   - External URLs unchanged

4. **Serve basePath stripping**
   - Requests with basePath served correctly
   - Requests without basePath return 404

### Integration tests

1. Build with basePath, verify all output paths correct
2. Serve with basePath, verify requests handled
3. End-to-end: build, serve, verify assets load

## Edge Cases

1. **Empty basePath** - Works identically to current behavior
2. **Nested basePath** - `/docs/v2` works correctly
3. **User forgets basePath** - Asset not in map, no hash applied, may 404
4. **CSS with relative paths** - `url("../fonts/x.woff")` unchanged (not in map)
5. **External URLs** - `url("https://...")` unchanged

## Future Considerations

1. **Build warnings** - Warn when public assets aren't referenced with basePath
2. **srcset support** - Parse and rewrite multiple URLs
3. **CSS @import** - Rewrite import paths if needed
4. **Dev server** - Apply same basePath logic

# bundler

Client-side JavaScript bundling for page hydration using esbuild.

## API

| Function       | Description                                    |
| -------------- | ---------------------------------------------- |
| `bundleClient` | Bundle a page for client-side hydration        |
| `stopEsbuild`  | Stop esbuild service (call when done bundling) |

## Usage

```ts
import { bundleClient, stopEsbuild } from "@tabirun/pages/bundler";
import { loadLayout, loadPage } from "@tabirun/pages/loaders";

// Load page and layouts
const page = await loadPage("/project/pages/blog/post.tsx");
const rootLayout = await loadLayout(
  "/project/pages/_layout.tsx",
  "/project/pages",
);
const blogLayout = await loadLayout(
  "/project/pages/blog/_layout.tsx",
  "/project/pages/blog",
);

// Bundle for development
const result = await bundleClient({
  page,
  layouts: [rootLayout, blogLayout],
  route: "/blog/post",
  outDir: "/project/.tabi/client",
  mode: "development",
  projectRoot: "/project",
});

console.log(result.publicPath); // "/_tabi/blog/post.js"
console.log(result.outputPath); // "/project/.tabi/client/blog/post.js"

// Bundle for production (with content hash)
const prodResult = await bundleClient({
  page,
  layouts: [rootLayout, blogLayout],
  route: "/blog/post",
  outDir: "/project/dist/_tabi",
  mode: "production",
  projectRoot: "/project",
});

console.log(prodResult.publicPath); // "/_tabi/blog/post-A1B2C3D4.js"
console.log(prodResult.hash); // "A1B2C3D4"

// Clean up when done
await stopEsbuild();
```

## Types

### BundleClientOptions

```ts
interface BundleClientOptions {
  /** Loaded page to bundle. */
  page: LoadedPage;
  /** Layout chain from root to innermost. */
  layouts: LoadedLayout[];
  /** Route path. Must start with "/". */
  route: string;
  /** Output directory for bundles. Must be absolute. */
  outDir: string;
  /** Build mode. */
  mode: "development" | "production";
  /** Project root for resolving imports. Must be absolute. */
  projectRoot: string;
}
```

### BundleClientResult

```ts
interface BundleClientResult {
  /** Absolute path to output bundle file. */
  outputPath: string;
  /** URL path for script src (e.g., "/_tabi/blog/post.js"). */
  publicPath: string;
  /** Content hash (production only). */
  hash?: string;
}
```

## Build Modes

### Development

- Unminified output for debugging
- Inline sourcemaps
- Deterministic filenames (no hash)

### Production

- Minified output
- No sourcemaps
- Content-hashed filenames for cache busting

## Output Structure

**Development:**

```
.tabi/client/
├── index.js
├── about.js
└── blog/
    └── post.js
```

**Production:**

```
dist/_tabi/
├── index-A1B2C3D4.js
├── about-E5F6G7H8.js
└── blog/
    └── post-I9J0K1L2.js
```

## Route Mapping

| Route        | Dev Bundle            | Prod Bundle                  |
| ------------ | --------------------- | ---------------------------- |
| `/`          | `/_tabi/index.js`     | `/_tabi/index-[hash].js`     |
| `/about`     | `/_tabi/about.js`     | `/_tabi/about-[hash].js`     |
| `/blog/post` | `/_tabi/blog/post.js` | `/_tabi/blog/post-[hash].js` |

## Error Handling

| Error         | Thrown When                                  |
| ------------- | -------------------------------------------- |
| `BundleError` | Bundling fails, invalid paths, esbuild error |

```ts
import { bundleClient, BundleError } from "@tabirun/pages/bundler";

try {
  const result = await bundleClient(options);
} catch (error) {
  if (error instanceof BundleError) {
    console.log(error.route); // Route that failed
    console.log(error.message); // Error description
    console.log(error.cause); // Underlying error (if any)
  }
}
```

## Notes

- Internal module used by dev/build
- Bundles include Preact runtime, layouts, and page component
- Markdown pages use `<Markdown />` component (content read from DOM)
- TSX pages bundle the page component directly
- Generated bundles hydrate into `#__tabi__` element
- Page data read from `#__TABI_DATA__` script element

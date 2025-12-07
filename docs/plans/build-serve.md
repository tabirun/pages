# Build and Serve Implementation Plan

## Overview

Implement `build()` and `serve()` functions for the pages factory. Build
generates static HTML + JS bundles, serve hosts them.

## Commits

### 1. feat(build): implement static site builder ✅

Implement the core build pipeline that:

- Scans pages directory for all pages
- Loads all pages and their layout chains
- For each page:
  - Composes with layouts
  - Renders to HTML (using existing renderer)
  - Bundles client JS (using existing bundler)
- Writes HTML files to output directory (route-based paths)
- Writes JS bundles to `__tabi/` subdirectory
- Generates `_not-found.html` and `_error.html` (custom or default)
- Applies root layout to system pages
- Copies public assets to output directory

**Files:**

- `build/builder.ts` - Core build logic
- `build/types.ts` - Build types and errors
- `build/defaults.tsx` - Default system page factories
- `build/defaults/_not-found.tsx` - Default 404 component
- `build/defaults/_error.tsx` - Default error component
- `build/tests/builder.test.ts` - Tests

**Key decisions:**

- Output structure: `dist/index.html`, `dist/blog/post.html`, `dist/__tabi/*.js`
- Clean output directory before build
- Production mode bundles (minified, hashed filenames)

### 2. feat(build): add asset cache busting

Add content-based hash suffixes to public assets for cache busting:

- Copy public assets with `[name]-[hash].[ext]` filenames
- Skip hashing for well-known files that must keep exact paths
- Post-process HTML to update asset URLs with hashed versions
- JS bundles already have hashes from bundler

**Files:**

- `build/assets.ts` - Asset copying with hashing
- `build/html-rewriter.ts` - HTML post-processing for asset URLs
- `build/builder.ts` - Wire up asset hashing
- `build/tests/assets.test.ts` - Tests

**Key decisions:**

- Use SHA-256 content hash (first 8 chars, uppercase)
- Rewrite `src`, `href`, and `url()` references in HTML
- Maintain original asset structure in output
- Skip hashing for these files (copied as-is):
  - `robots.txt`
  - `sitemap.xml`
  - `favicon.ico`
  - `.well-known/*`

### 3. feat(build): add UnoCSS support

Compile UnoCSS when `uno.config.ts` is present:

- Scan all source files for class usage
- Generate single CSS file with content hash
- Inject stylesheet link into HTML `<head>`

**Files:**

- `build/unocss.ts` - UnoCSS compilation (based on @deno-mage/app reference)
- `build/builder.ts` - Wire up UnoCSS processing
- `build/tests/unocss.test.ts` - Tests

**Key decisions:**

- Zero-config: only runs if `uno.config.ts` exists
- Output to `__styles/[hash].css`
- Inject `<link rel="stylesheet">` into rendered HTML
- Scan `.tsx`, `.ts`, `.jsx`, `.js`, `.md`, `.html` files

### 4. feat(build): add sitemap generation

Generate `sitemap.xml` when configured:

- Add optional `sitemap` config to build options
- Generate sitemap with all page routes as absolute URLs
- Exclude system pages (`/_not-found`, `/_error`) by default
- Allow additional route exclusions via config

**Files:**

- `build/sitemap.ts` - Sitemap XML generation
- `build/types.ts` - Add SitemapOptions type
- `build/builder.ts` - Wire up sitemap generation
- `build/tests/sitemap.test.ts` - Tests

**Key decisions:**

- Only generated when `sitemap.baseUrl` is provided
- System pages always excluded (not useful for crawlers)
- Config shape: `sitemap: { baseUrl: string, exclude?: string[] }`
- Output as `sitemap.xml` (no hash, well-known path)

### 5. feat(build): wire builder to pages factory

Connect the builder to the `pages()` factory function.

**Files:**

- `pages/factory.ts` - Wire up build function
- `pages/tests/mod.test.ts` - Integration tests

### 6. feat(serve): implement static file server

Simple static server that:

- Serves HTML files from dist directory
- Serves `index.html` for directory paths
- Serves JS bundles from `__tabi/`
- Serves CSS from `__styles/`
- Returns 404 with `_not-found.html` if it exists

**Files:**

- `serve/server.ts` - Static server registration
- `serve/types.ts` - Serve types
- `serve/tests/server.test.ts` - Tests

**Key decisions:**

- Use `@tabirun/app` serveFiles middleware
- Pre-load `_not-found.html` at startup (non-blocking 404s)
- Normalize base path handling
- Set appropriate cache headers for hashed assets

### 7. feat(serve): wire server to pages factory

Connect the server to the `pages()` factory function.

**Files:**

- `pages/factory.ts` - Wire up serve function
- `pages/tests/mod.test.ts` - Integration tests

## Output Structure

```
dist/
├── index.html              # / route
├── about.html              # /about route
├── blog/
│   ├── index.html          # /blog route
│   └── hello-world.html    # /blog/hello-world route
├── __tabi/
│   ├── index-A1B2C3D4.js   # Client bundle for /
│   ├── about-E5F6G7H8.js   # Client bundle for /about
│   └── ...
├── __styles/
│   └── A1B2C3D4.css        # UnoCSS output (if uno.config.ts exists)
├── images/
│   └── logo-I9J0K1L2.png   # Hashed public assets
├── robots.txt              # Copied as-is (no hash)
├── favicon.ico             # Copied as-is (no hash)
├── sitemap.xml             # Generated (if sitemap.baseUrl configured)
├── _not-found.html         # 404 page (custom or default)
└── _error.html             # Error page (custom or default)
```

## Dependencies

Build depends on:

- `scanner/` - Page discovery
- `loaders/` - Page/layout loading
- `renderer/` - HTML rendering
- `bundler/` - Client JS bundling
- `@unocss/core` - UnoCSS generation (optional)

Serve depends on:

- `@tabirun/app` - serveFiles middleware

## Testing Strategy

- Unit tests for builder with fixture pages
- Unit tests for asset hashing (including skip-hash paths)
- Unit tests for HTML rewriting
- Unit tests for sitemap generation
- Unit tests for UnoCSS (with mock config)
- Unit tests for serve with mock app
- All modules get 100% coverage

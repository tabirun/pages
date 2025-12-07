# Build and Serve Implementation Plan

## Overview

Implement `build()` and `serve()` functions for the pages factory. Build
generates static HTML + JS bundles, serve hosts them.

## Commits

### 1. feat(build): implement static site builder

Implement the core build pipeline that:

- Scans pages directory for all pages
- Loads all pages and their layout chains
- For each page:
  - Composes with layouts
  - Renders to HTML (using existing renderer)
  - Bundles client JS (using existing bundler)
- Writes HTML files to output directory (route-based paths)
- Writes JS bundles to `__tabi/` subdirectory

**Files:**

- `build/builder.ts` - Core build logic
- `build/types.ts` - Build types and errors
- `build/tests/builder.test.ts` - Tests

**Key decisions:**

- Output structure: `dist/index.html`, `dist/blog/post.html`, `dist/__tabi/*.js`
- Clean output directory before build
- Production mode bundles (minified, hashed filenames)

### 2. feat(build): wire builder to pages factory

Connect the builder to the `pages()` factory function.

**Files:**

- `pages/factory.ts` - Wire up build function
- `pages/tests/mod.test.ts` - Integration tests

### 3. feat(serve): implement static file server

Simple static server that:

- Serves HTML files from dist directory
- Serves `index.html` for directory paths
- Serves JS bundles from `__tabi/`
- Returns 404 with `_not-found.html` if it exists

**Files:**

- `serve/server.ts` - Static server registration
- `serve/types.ts` - Serve types
- `serve/tests/server.test.ts` - Tests

**Key decisions:**

- Use `@tabirun/app` serveFiles middleware
- Pre-load `_not-found.html` at startup (non-blocking 404s)
- Normalize base path handling

### 4. feat(serve): wire server to pages factory

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
│   ├── index.[hash].js     # Client bundle for /
│   ├── about.[hash].js     # Client bundle for /about
│   └── ...
└── _not-found.html         # Optional 404 page
```

## Dependencies

Build depends on:

- `scanner/` - Page discovery
- `loaders/` - Page/layout loading
- `renderer/` - HTML rendering
- `bundler/` - Client JS bundling

Serve depends on:

- `@tabirun/app` - serveFiles middleware

## Testing Strategy

- Unit tests for builder with fixture pages
- Unit tests for serve with mock app
- Both modules get 100% coverage

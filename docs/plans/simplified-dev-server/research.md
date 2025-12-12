# Research: Simplified Dev Server Implementation

## Task

Implement a simplified dev server for Tabirun Pages using a subprocess-based
approach to escape Deno's module cache. Structure includes:

- `dev/server.ts` - HTTP server with WebSocket for HMR
- `dev/build-page.ts` - Subprocess entry point for building single pages
- `dev/mod.ts` - Public exports

The server should integrate with the existing scanner for file watching, build a
single page on-demand in a subprocess, inject HMR script, and respond to
requests.

## Codebase Overview

Tabirun Pages is a static site generator built on Preact and Deno, providing
file-based routing, Markdown support, and Preact component pages with universal
hydration.

### Tech Stack

- **Runtime**: Deno
- **UI Framework**: Preact (via JSX with `jsxImportSource: "preact"`)
- **Bundler**: esbuild (for client-side and SSR bundles)
- **Markdown**: GFM + Shiki syntax highlighting
- **File Watching**: Deno.watchFs (wrapped in scanner module)
- **HTTP Framework**: TabiApp (Tabi's custom framework)

### Relevant Directories

- `scanner/` - File discovery and watching
- `build/` - Static site generation (production builds)
- `serve/` - Static file serving for production
- `pages/` - Factory function that exposes dev/build/serve
- `bundler/` - Client-side JS bundling with esbuild
- `renderer/` - Server-side rendering to HTML
- `loaders/` - Page and layout loading with frontmatter validation
- `preact/` - Preact components (Markdown, Head, FrontmatterProvider)

## Relevant Files

| File                       | Relevance                                                             |
| -------------------------- | --------------------------------------------------------------------- |
| `scanner/scanner.ts`       | Page discovery - scans pages directory, builds layout chains          |
| `scanner/watcher.ts`       | File watching - emits FileChangeEvent on create/update/delete         |
| `scanner/types.ts`         | PageEntry, FileChangeEvent, FileCategory types                        |
| `build/builder.ts`         | Production build - shows how to build single pages                    |
| `bundler/client.ts`        | Client bundling - bundles page + layouts for browser                  |
| `renderer/renderer.tsx`    | SSR - renders page to HTML with hydration support                     |
| `loaders/loader.ts`        | Page loading - loads .md or .tsx pages with frontmatter               |
| `loaders/layout-loader.ts` | Layout loading - loads _layout.tsx files                              |
| `serve/server.ts`          | Static server - shows how to serve pre-built files                    |
| `pages/factory.ts`         | Factory pattern - how modules integrate via dev/build/serve functions |
| `pages/types.ts`           | DevOptions, DevFn types for integration                               |

## Existing Patterns

### Scanner Integration

The scanner module provides two key functions:

```typescript
// One-time scan for all pages
const manifest = await scanPages({
  rootDir: "/path/to/project",
  pagesDir: "pages", // default
  publicDir: "public", // default
});

// Watch for file changes
const handle = watchPages(
  {
    rootDir: "/path/to/project",
    pagesDir: "pages",
    debounceMs: 100, // default
  },
  (event: FileChangeEvent) => {
    // event.type: "create" | "update" | "delete"
    // event.category: "page" | "layout" | "system" | "unoConfig" | "publicAsset" | "code"
    // event.filePath: absolute path
    // event.route?: route for pages (e.g., "/blog/post")
  },
);

// Stop watching
handle.stop();
```

**Key event categories:**

- `page` - .md or .tsx page files
- `layout` - _layout.tsx files
- `system` - _document.tsx, _404.tsx, _error.tsx
- `code` - Other .ts/.tsx files (components, utilities)
- `unoConfig` - uno.config.ts at project root
- `publicAsset` - Files in public directory

**Layout chains**: Scanner automatically builds layout chains for each page
based on directory structure. E.g., `pages/blog/post.md` gets
`[rootLayout, blogLayout]`.

### Single Page Build Pattern

From `build/builder.ts`, the pattern for building a single page:

```typescript
async function buildPage(options: BuildPageOptions): Promise<BuildPageResult> {
  const { pageEntry, pagesDir, outDir, layoutCache, document, basePath } =
    options;
  const { route, filePath, layoutChain } = pageEntry;

  // 1. Load page
  const page = await loadPage(filePath);

  // 2. Load layouts (with caching)
  const layouts = await loadLayoutChain(layoutChain, layoutCache);

  // 3. Bundle client JS
  const bundleResult = await bundleClient({
    page,
    layouts,
    route,
    outDir: join(outDir, "__tabi"),
    mode: "production",
    projectRoot: dirname(pagesDir),
    basePath,
  });

  // 4. Render to HTML
  const { html } = await renderPage({
    page,
    layouts,
    clientBundlePath: bundleResult.publicPath,
    route,
    document,
    basePath,
  });

  // 5. Write HTML file
  const htmlPath = routeToHtmlPath(route, outDir);
  await ensureDir(dirname(htmlPath));
  await Deno.writeTextFile(htmlPath, html);

  return {
    route,
    htmlPath,
    bundlePath: bundleResult.outputPath,
    bundlePublicPath: bundleResult.publicPath,
  };
}
```

**Key insights:**

- Layout caching improves performance when building multiple pages
- `bundleClient` takes `mode: "development" | "production"`
- Development mode: unminified, inline sourcemaps, deterministic filenames
- Production mode: minified, no sourcemaps, content-hashed filenames
- `renderPage` returns complete HTML with DOCTYPE

### Static Server Pattern

From `serve/server.ts`, how production server works:

```typescript
export function registerStaticServer(
  app: TabiApp,
  options: StaticServerOptions = {},
): void {
  const rootDir = options.rootDir ?? "./";
  const basePath = options.basePath ?? "";

  // Pre-load _not-found.html at startup
  const notFoundPath = join(rootDir, "_not-found.html");
  let notFoundHtml: string | null = null;
  try {
    notFoundHtml = Deno.readTextFileSync(notFoundPath);
  } catch {
    // _not-found.html doesn't exist, will use default notFound
  }

  const handleNotFound = (c: TabiContext) => {
    if (notFoundHtml) {
      c.html(notFoundHtml, 404);
    } else {
      c.notFound();
    }
  };

  const routePattern = basePath ? `${basePath}/*` : "/*";

  app.get(
    routePattern,
    serveFiles({
      directory: rootDir,
      serveIndex: true,
      onNotFound: handleNotFound,
    }),
  );

  if (basePath) {
    app.get("/*", (c) => {
      handleNotFound(c);
    });
  }
}
```

**Key insights:**

- Uses TabiApp middleware pattern with `app.get(pattern, handler)`
- Pre-loads error pages at startup for performance
- Supports basePath for hosting at subpaths
- Uses `serveFiles` middleware from `@tabirun/app/serve-files`

### Factory Registration Pattern

From `pages/factory.ts`, how modules integrate:

```typescript
export function pages(config: PagesConfig = {}): PagesInstance {
  const parsed = PagesConfigSchema.parse(config);
  const basePath = parsed.basePath;

  function dev(app: TabiApp, options: DevOptions = {}): Promise<void> {
    // TODO: implement dev server
    throw new Error("Not implemented");
  }

  async function build(options: BuildOptions = {}): Promise<void> {
    const pagesDir = resolve(options.pagesDir ?? "./pages");
    const outDir = resolve(options.outDir ?? "./dist");
    const sitemap = config.siteMetadata
      ? { baseUrl: config.siteMetadata.baseUrl }
      : undefined;
    await buildSite({ pagesDir, outDir, sitemap, basePath });
  }

  function serve(app: TabiApp, options: ServeOptions = {}): void {
    const rootDir = resolve(options.dir ?? "./dist");
    registerStaticServer(app, { rootDir, basePath });
  }

  return { dev, build, serve };
}
```

**Key insights:**

- Dev function signature:
  `(app: TabiApp, options?: DevOptions) => Promise<void>`
- DevOptions has `pagesDir?: string` (defaults to "./pages")
- Function should register middleware on the app, not return a handler
- basePath comes from factory config, not DevOptions

### Page Structure

**PageEntry** (from scanner):

```typescript
interface PageEntry {
  filePath: string; // Absolute path to .md or .tsx file
  route: string; // URL route (e.g., "/blog/post")
  type: "markdown" | "tsx";
  layoutChain: string[]; // Absolute paths to layouts, root to leaf
}
```

**Route mapping** (from `scanner/routes.ts`):

- `index.md` → `/`
- `about.tsx` → `/about`
- `blog/index.md` → `/blog`
- `blog/post.md` → `/blog/post`

**Page ID**: Routes serve as unique identifiers. No separate "page ID" concept -
the route is the ID.

## Documentation Found

### Vision

Tabi Pages is a static site generator optimized for documentation and blog sites
with:

- Single rendering pipeline for all content
- Markdown-first with Preact for interactivity
- File-based routing with nested layouts
- Fast development with hot reload
- Static build output

Core principles: simple over clever, single pipeline, Preact for interactivity.

### ADRs

**ADR-003: Universal Hydration**

- All pages hydrate (both .md and .tsx) because layouts need interactivity
- Layouts commonly have nav toggles, theme switchers, search modals
- Single rendering path, no islands/partial hydration
- Bundle size acceptable for doc/blog use case

**ADR-004: SSR Bundling Strategy**

- **Critical**: Deno caches dynamic imports - can't get fresh user code
- Solution for production build: Use Deno imports (one-shot process, no caching
  issue)
- Solution for dev: Would need esbuild SSR bundling (see ADR)
- User code imports user code with static paths - can't cache-bust
- `--reload` flag doesn't help for programmatic imports

**ADR-005: Client Bundle Architecture**

- TSX pages bundle: page component + layouts + Preact runtime
- Markdown pages bundle: layouts only (content already in HTML)
- Page data serialized in `<script id="__TABI_DATA__">` for hydration
- Bundles served at `/__tabi/[route].js` (dev) or `/__tabi/[route]-[hash].js`
  (prod)
- Development: unminified, inline sourcemaps, deterministic names
- Production: minified, no sourcemaps, content-hashed names

### READMEs

**scanner/README.md**

- `scanPages()` returns PageManifest with pages, layouts, systemFiles,
  publicAssets
- `watchPages()` returns WatchHandle with stop() method
- Events are debounced (100ms default) to handle rapid changes
- Watcher skips node_modules, dist, coverage, and hidden directories
- Layout chains computed at scan time

**build/README.md** (inferred from code)

- `buildSite()` orchestrates full build: scan, render, bundle, copy assets
- Builds _not-found.html and _error.html (custom or default)
- Supports UnoCSS compilation if uno.config.ts exists
- Post-processes HTML to rewrite asset URLs and inject stylesheets
- Generates sitemap.xml if siteMetadata provided

**bundler/README.md**

- `bundleClient()` bundles page for client-side hydration
- Takes LoadedPage, layouts, route, outDir, mode, projectRoot
- Returns outputPath, publicPath, hash (production only)
- Uses esbuild with stdin for in-memory bundling
- `stopEsbuild()` must be called when done to release resources

**renderer/README.md**

- `renderPage()` orchestrates full SSR pipeline
- Steps: Compose → Render → Markdown → Head → Serialize → Document
- Returns complete HTML with DOCTYPE
- Supports custom document components via DocumentProps
- Handles `<tabi-markdown>` marker extraction and processing
- Handles `<tabi-head>` marker extraction to document head

**loaders/README.md**

- `loadPage()` auto-detects .md or .tsx and loads with frontmatter
- `loadLayout()` loads _layout.tsx component
- Frontmatter validated with Zod schema (PageFrontmatterSchema)
- TSX files dynamically imported via `file://` URLs
- Markdown frontmatter extracted from YAML block at file start

## Key Considerations

### Module Cache Problem (Critical)

Per ADR-004, Deno's module cache is the fundamental constraint:

- Once a module is imported, Deno caches it permanently in the process
- Cache-busting query params (`?t=${Date.now()}`) only help for
  framework-controlled imports
- User code has static imports that can't be cache-busted
- Changing `Header` component doesn't refresh if `_layout.tsx` already imported
  it

**Implication for simplified dev server:** The subprocess approach is
essential - we cannot use in-process SSR bundling like ADR-004 describes
because:

1. Each request would get stale user code from Deno's cache
2. File watcher would detect changes but imports would return cached modules
3. User would need to restart dev server to see changes (terrible DX)

**Subprocess approach solves this:**

- Each page build runs in fresh Deno process
- No module cache - every build gets fresh code
- Process exits after build completes
- Slower than in-process but only way to get fresh code

### Build Performance

Production build doesn't have module cache issue (one-shot process), but dev
server does.

**Performance considerations:**

- Subprocess spawn overhead (~50-100ms)
- Build time for single page (~100-300ms depending on complexity)
- Total request latency: ~150-400ms acceptable for dev
- No caching needed if latency is acceptable
- Could add optional caching later based on file mtimes

### Error Handling

Dev server must handle and display:

- Page not found (route doesn't match any page)
- Build errors (syntax errors, import failures, type errors)
- Render errors (component throws during SSR)

Pattern from production:

- System pages: _not-found.html, _error.html
- Dev should show rich error overlay with stack traces
- Consider preserving last known good HTML on error

### WebSocket HMR Protocol

Simple message-based protocol for extensibility:

```typescript
// Server → Client
type HMRMessage =
  | { type: "reload" } // Full page reload
  | { type: "update"; modules: string[] }; // Future: granular updates

// Client → Server (future)
type HMRClientMessage = { type: "ping" };
```

Start with full-page reload only. Structure allows adding:

- Module-level updates
- CSS hot reload
- State preservation

### UnoCSS Support

Dev server should support UnoCSS if `uno.config.ts` exists:

- Compile CSS on-demand per request (like page build)
- Serve at `/__styles/uno.css` with basePath support
- Inject stylesheet link into HTML
- Recompile when uno.config.ts changes

From build: `compileUnoCSS()` from `unocss/compiler.ts`, `injectStylesheet()`
helper

### Public Assets

Dev server should serve files from `public/` directory:

- Serve at their URL paths (e.g., `/favicon.ico`)
- Use TabiApp's `serveFiles` middleware
- Watch for changes and reload page when public asset changes

### System Pages in Dev

For dev server:

- Don't pre-build _not-found.html (build on-demand like regular pages)
- Show rich error overlay for errors instead of _error.html
- System pages should work if user creates them (custom 404)

### BasePath Support

Dev server must respect basePath from factory config:

- All routes prefixed with basePath
- Client bundles served at `${basePath}/__tabi/...`
- UnoCSS served at `${basePath}/__styles/uno.css`
- Public assets served at `${basePath}/...`
- WebSocket connections at `${basePath}/__ws` or similar

## Recommended Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Server (main process)               │
│  - TabiApp middleware                                        │
│  - Route: GET ${basePath}/* → handlePageRequest              │
│  - Route: GET ${basePath}/__ws → WebSocket upgrade           │
│  - Route: GET ${basePath}/__tabi/* → serve bundles           │
│  - Route: GET ${basePath}/__styles/* → serve UnoCSS          │
│  - serveFiles for public assets                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
        ┌──────────────────────────────────────┐
        │    File Watcher (scanner/watcher)    │
        │  - Emits FileChangeEvent              │
        │  - Broadcasts "reload" via WebSocket  │
        └──────────────────────────────────────┘
                              │
                              ↓
        ┌──────────────────────────────────────┐
        │   Page Request Handler                │
        │  1. Match route to PageEntry          │
        │  2. Spawn subprocess for build        │
        │  3. Inject HMR script                 │
        │  4. Return HTML response              │
        └──────────────────────────────────────┘
                              │
                              ↓
        ┌──────────────────────────────────────┐
        │   Subprocess (dev/build-page.ts)      │
        │  1. Load page + layouts               │
        │  2. Bundle client JS                  │
        │  3. Render to HTML                    │
        │  4. Write bundle to disk              │
        │  5. Print JSON to stdout              │
        │  6. Exit                               │
        └──────────────────────────────────────┘
```

### Module Structure

```
dev/
├── mod.ts              # Public exports: registerDevServer
├── server.ts           # Main HTTP + WS server logic
├── build-page.ts       # Subprocess entry point
├── handlers.ts         # Request handlers (page, bundle, UnoCSS)
├── websocket.ts        # WebSocket HMR connection handling
├── types.ts            # Types for dev server
└── tests/
    ├── server.test.ts
    ├── build-page.test.ts
    ├── handlers.test.ts
    └── websocket.test.ts
```

### Implementation Steps

1. **Create subprocess builder** (`dev/build-page.ts`)
   - CLI entry point that takes route as argument
   - Scan pages to find matching PageEntry
   - Build single page using existing build pattern
   - Write bundle to temp directory
   - Output JSON with htmlPath, bundlePath to stdout
   - Exit with appropriate code

2. **Create request handlers** (`dev/handlers.ts`)
   - `handlePageRequest(route)`: Spawn subprocess, read HTML, inject HMR script
   - `handleBundleRequest(path)`: Serve bundle from temp directory
   - `handleUnoCSSRequest()`: Compile and serve UnoCSS
   - Error handling for each handler

3. **Create WebSocket handler** (`dev/websocket.ts`)
   - Upgrade HTTP to WebSocket
   - Maintain set of connected clients
   - Broadcast reload messages
   - Handle client disconnect

4. **Wire file watcher** (`dev/server.ts`)
   - Start watchPages on server init
   - On FileChangeEvent, broadcast reload to all WS clients
   - Track file categories to enable granular updates later
   - Stop watcher on server shutdown

5. **Integrate with factory** (`dev/server.ts`, `pages/factory.ts`)
   - `registerDevServer(app, options)` function
   - Register all routes on TabiApp
   - Call from `pages().dev()`
   - Handle basePath from config

6. **Add HMR client script** (inline in HTML)
   - Connect to WebSocket
   - Listen for "reload" message
   - Reload page on message
   - Auto-reconnect on disconnect

### Open Questions

None - research is sufficient to proceed.

The simplified approach is well-defined:

- Use subprocess to escape module cache (no SSR bundling)
- Single page builds on-demand (acceptable latency)
- WebSocket for reload notifications
- Existing patterns for page building, bundling, rendering
- Scanner provides file watching

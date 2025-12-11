# Research: Dev Server Implementation

## Task

Implement the `dev()` function for the Tabi Pages framework to provide a
development server with:

- Hot reload via WebSocket
- Fresh SSR on every request (bypassing Deno's module cache)
- On-demand bundling for client and SSR

## Codebase Overview

This is a Deno-based pages/routing framework similar to Next.js, designed for
building static sites and documentation with Markdown and Preact. The framework
follows a file-based routing approach with layouts, system pages, and automatic
hydration.

### Tech Stack

- **Runtime**: Deno
- **Framework**: Tabi App (custom HTTP framework from `@tabirun/app`)
- **UI Library**: Preact (lightweight React alternative)
- **SSR**: `preact-render-to-string`
- **Bundler**: esbuild
- **CSS**: UnoCSS (optional, configured via `uno.config.ts`)
- **Markdown**: Custom pipeline with Shiki syntax highlighting
- **File Watching**: Deno's built-in `Deno.watchFs`
- **Validation**: Zod schemas

### Relevant Directories

```
/Users/leecheneler/projects/tabirun/pages/
├── pages/           - Factory function and types
│   ├── factory.ts   - pages() factory with dev/build/serve functions
│   ├── types.ts     - TypeScript interfaces
│   └── config.ts    - Zod configuration schema
├── scanner/         - File system scanning and watching
│   ├── scanner.ts   - scanPages() to build manifest
│   ├── watcher.ts   - watchPages() with debounced events
│   ├── routes.ts    - Route path generation
│   └── types.ts     - PageManifest, FileChangeEvent types
├── loaders/         - File loading and parsing
│   ├── loader.ts    - loadPage() for .md and .tsx
│   ├── markdown-loader.ts - Markdown with frontmatter
│   ├── tsx-loader.ts - TSX with component/frontmatter
│   └── layout-loader.ts - Layout components
├── bundler/         - Client-side bundling
│   ├── client.ts    - bundleClient() with esbuild
│   ├── entry.ts     - generateClientEntry() for hydration
│   └── types.ts     - BundleClientOptions, BundleClientResult
├── renderer/        - SSR rendering
│   ├── renderer.tsx - renderPage() full SSR pipeline
│   ├── compose.tsx  - composeTree() layout composition
│   ├── serialize.ts - serializePageData() for hydration
│   └── document.tsx - DefaultDocument component
├── markdown/        - Markdown processing
│   ├── renderer.ts  - renderMarkdown() with Shiki
│   └── extractor.ts - processMarkdownMarkers()
├── preact/          - Preact components and utilities
│   ├── context.tsx  - FrontmatterProvider, BasePathProvider
│   ├── markdown.tsx - Markdown hydration component
│   └── markdown-cache.tsx - MarkdownCacheProvider
├── unocss/          - UnoCSS compilation
│   └── compiler.ts  - compileUnoCSS(), injectStylesheet()
├── build/           - Production build
│   └── builder.ts   - buildSite() orchestration
├── serve/           - Static file serving
│   └── server.ts    - registerStaticServer()
└── utils/           - Shared utilities
    ├── html.ts      - HTML manipulation
    └── js.ts        - JavaScript code generation
```

## Relevant Files

| File                                                                     | Relevance                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `/Users/leecheneler/projects/tabirun/pages/pages/factory.ts`             | Contains `dev()` stub that needs implementation               |
| `/Users/leecheneler/projects/tabirun/pages/docs/plans/dev-server.md`     | Detailed plan with architecture decisions                     |
| `/Users/leecheneler/projects/tabirun/pages/docs/adr/004-ssr-bundling.md` | Critical context on Deno caching problem and esbuild solution |
| `/Users/leecheneler/projects/tabirun/pages/scanner/watcher.ts`           | File watcher implementation with debouncing                   |
| `/Users/leecheneler/projects/tabirun/pages/scanner/scanner.ts`           | Page manifest generation                                      |
| `/Users/leecheneler/projects/tabirun/pages/bundler/client.ts`            | Client bundling with esbuild (reference for SSR bundler)      |
| `/Users/leecheneler/projects/tabirun/pages/bundler/entry.ts`             | Entry code generation pattern                                 |
| `/Users/leecheneler/projects/tabirun/pages/renderer/renderer.tsx`        | SSR rendering pipeline                                        |
| `/Users/leecheneler/projects/tabirun/pages/build/builder.ts`             | Build orchestration (reference for dev flow)                  |
| `/Users/leecheneler/projects/tabirun/pages/serve/server.ts`              | Static server pattern for registering routes                  |
| `/Users/leecheneler/projects/tabirun/pages/unocss/compiler.ts`           | UnoCSS compilation for dev mode                               |

## Existing Patterns

### 1. Route Registration Pattern

From `serve/server.ts`:

```typescript
export function registerStaticServer(
  app: TabiApp,
  options: StaticServerOptions = {},
): void {
  const rootDir = options.rootDir ?? "./";
  const basePath = options.basePath ?? "";

  const routePattern = basePath ? `${basePath}/*` : "/*";

  app.get(
    routePattern,
    serveFiles({
      directory: rootDir,
      serveIndex: true,
      onNotFound: handleNotFound,
    }),
  );
}
```

**Pattern**: Register routes with basePath support, use middleware for serving.

### 2. File Watching Pattern

From `scanner/watcher.ts`:

```typescript
export function watchPages(
  options: WatchOptions,
  onChange: (event: FileChangeEvent) => void,
): WatchHandle {
  const watcher = Deno.watchFs(rootDir, { recursive: true });

  // Debounced event processing
  const flush = debounce(() => {
    for (const event of pendingEvents.values()) {
      onChange(event);
    }
    pendingEvents.clear();
  }, debounceMs);

  return {
    stop() {
      watcher.close();
      flush.clear();
    },
  };
}
```

**Pattern**:

- Watches entire project root
- Debounces events (default 100ms)
- Categorizes files (page, layout, system, code, unoConfig, publicAsset)
- Returns handle with cleanup function
- Filters out node_modules, dist, hidden directories

### 3. Client Bundling Pattern

From `bundler/client.ts`:

```typescript
export async function bundleClient(
  options: BundleClientOptions,
): Promise<BundleClientResult> {
  const entryCode = generateClientEntry(page, layouts, preactDir);

  const result = await esbuild.build({
    stdin: {
      contents: entryCode,
      loader: "tsx",
      resolveDir: projectRoot,
    },
    bundle: true,
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    jsxImportSource: "preact",
    minify: mode === "production",
    sourcemap: mode === "development" ? "inline" : false,
    write: false, // In-memory
  });

  const code = result.outputFiles[0].text;
  await Deno.writeTextFile(outputPath, code);

  return { outputPath, publicPath };
}
```

**Pattern**:

- Generate entry code as string
- Use esbuild stdin with `write: false` for in-memory bundling
- Different settings for dev vs production
- Return both file path and public URL path

### 4. SSR Rendering Pipeline

From `renderer/renderer.tsx`:

```typescript
export async function renderPage(
  options: RenderPageOptions,
): Promise<RenderPageResult> {
  // 1. Compose component tree
  const Tree = composeTree(page, layouts, basePath);

  // 2. Render to HTML string
  const rawHtml = render(<Tree />);

  // 3. Process markdown markers (async)
  const { html: bodyAfterMarkdown, cache: markdownCache } =
    await processMarkdownMarkers(rawHtml);

  // 4. Extract head markers
  const { head: headContent, html: bodyWithoutHead } = processHeadMarkers(
    bodyAfterMarkdown,
  );

  // 5. Serialize page data
  const dataScript = serializePageData(page, route, markdownCache, basePath);
  const bundleScript =
    `<script type="module" src="${clientBundlePath}"></script>`;

  // 6. Assemble body
  const bodyContent = (
    <>
      <div
        id="__tabi__"
        dangerouslySetInnerHTML={{ __html: bodyWithoutHead }}
      />
      <div dangerouslySetInnerHTML={{ __html: dataScript }} />
      <div dangerouslySetInnerHTML={{ __html: bundleScript }} />
    </>
  );

  // 7. Render document shell
  const Document = document ?? DefaultDocument;
  const documentHtml = render(<Document head={null}>{bodyContent}</Document>);

  // 8. Inject head content
  const finalHtml = injectHeadContent(documentHtml, headContent);

  return { html: `<!DOCTYPE html>${finalHtml}` };
}
```

**Pattern**: Multi-stage pipeline with post-processing, markdown rendering, and
data serialization.

### 5. Component Tree Composition

From `renderer/compose.tsx` and `bundler/entry.ts`, the framework uses a
consistent wrapping pattern:

```tsx
<BasePathProvider basePath="">
  <MarkdownCacheProvider initialData={...}>
    <FrontmatterProvider frontmatter={...}>
      <Layout0>
        <Layout1>
          <Page /> or <Markdown />
        </Layout1>
      </Layout0>
    </FrontmatterProvider>
  </MarkdownCacheProvider>
</BasePathProvider>
```

**Pattern**: Always wrap in providers, layouts from root to innermost, then page
component.

### 6. Page Manifest Structure

From `scanner/types.ts`:

```typescript
export interface PageManifest {
  pages: PageEntry[]; // All discovered pages
  layouts: LayoutEntry[]; // Layout files
  systemFiles: SystemFiles; // _html, _not-found, _error, uno.config.ts
  publicAssets: PublicAsset[]; // Files in public/
}
```

**Pattern**: Single manifest object with all site metadata, built via
`scanPages()`.

## Documentation Found

### Vision

No standalone vision document found. Philosophy is embedded in README:

- "The shortest path between two points is a straight line"
- No abstractions to fight
- No magic to reverse-engineer
- Stress-free builds

### ADRs

**ADR-004: SSR Bundling Strategy** (Most Critical)

**Problem**: Deno caches dynamic imports. Even with cache-busting on direct
imports, nested user imports remain cached.

Example:

```tsx
// pages/_layout.tsx
import { Header } from "../components/header.tsx"; // This gets cached!
```

Cache-busting the layout import doesn't help because the layout's static imports
are baked in.

**Solution**: Use esbuild to bundle SSR code, import via data URL to bypass
module cache entirely.

```typescript
const result = await esbuild.build({
  stdin: { contents: entryCode },
  write: false,
});
const code = result.outputFiles[0].text;
const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
const module = await import(dataUrl);
```

This is the core architectural decision for dev server SSR.

**ADR-005: Client Bundle Architecture**

Defines the client-side hydration strategy:

- TSX pages ship component + layouts
- Markdown pages ship layouts only (content in HTML)
- Data serialized in `<script id="__TABI_DATA__">`
- Hydration into `<div id="__tabi__">`

**ADR-007: Base Path Strategy** (Likely exists based on code)

The framework supports hosting at a subpath (e.g., `/docs`):

- `basePath` config option
- All routes, bundles, and assets prefixed
- Provider for client-side access

### Existing Plans

**`docs/plans/dev-server.md`** - Comprehensive implementation plan

Key sections:

1. **Architecture**: New `dev/` module with clear separation of concerns
2. **Components**:
   - `hot-reload.ts` - WebSocket server for browser communication
   - `ssr-bundler.ts` - esbuild bundling with data URL imports
   - `error-overlay.tsx` - Inline-styled error display
   - `client-script.ts` - Hot reload client script generation
   - `server.ts` - Main dev server orchestration
3. **Request Flow**: Detailed flow from page request to HTML response
4. **File Change Flow**: Watch events → categorization → manifest invalidation →
   reload
5. **Design Decisions**:
   - No caching initially (KISS principle)
   - No HMR, full page reload only
   - In-memory bundles
   - Inline error styles
6. **Implementation Order**: Bottom-up, testable components first

### READMEs

Module READMEs exist for each major component:

- `scanner/README.md`
- `bundler/README.md`
- `renderer/README.md`
- `loaders/README.md`
- etc.

These provide module-level documentation of purpose and usage.

## Key Considerations

### 1. Deno Module Caching (Critical)

Per ADR-004, this is the primary technical challenge:

- Deno caches all imports
- Cache-busting direct imports doesn't help with transitive imports
- **Solution**: Bundle SSR code with esbuild, import via data URL
- This is not optional - it's the only way to get fresh code on every request

### 2. WebSocket for Hot Reload

Standard pattern for dev servers:

- WebSocket endpoint at `/__hot-reload` (with basePath prefix)
- Simple protocol: `{ type: "reload" }` and `{ type: "error", message, stack }`
- Client script injected into every page
- Reconnect logic for server restarts

### 3. File Watching Strategy

From existing `watcher.ts`:

- Watch entire project root (filtering is category-based)
- Debounce events (100ms default)
- Categorize changes:
  - `page` - Individual page changed
  - `layout` - Layout affects multiple pages
  - `system` - _html, _not-found, _error changed
  - `code` - Utility/component changed (affects anything that imports it)
  - `unoConfig` - Rebuild UnoCSS
  - `publicAsset` - Copy to dev server
- For `layout`, `system`, or `code` changes: invalidate manifest (force rescan)

### 4. Manifest Invalidation

The plan calls for manifest caching with invalidation:

```typescript
interface DevServerState {
  manifest: PageManifest | null;
  hotReload: HotReloadServer;
  stopWatcher: (() => void) | null;
}
```

When to invalidate:

- Layout changes (affects layout chains)
- System file changes (affects all pages)
- Code changes (could affect any importer)
- New/deleted pages (structural change)

When NOT to invalidate:

- Single page content change (only affects that page)
- Public asset change (no impact on manifest)

### 5. Error Handling

Dev mode should be resilient:

- Errors during SSR → show error overlay HTML
- Errors during bundling → show error overlay HTML
- Errors during file watch → log but don't crash
- Send errors to WebSocket clients for overlay
- Error overlay includes hot reload script (auto-recover when fixed)

### 6. In-Memory vs On-Disk

Per the plan:

- SSR bundles: In-memory only (via data URL import)
- Client bundles: Written to `.tabi/client/` directory
- UnoCSS: Generated to `.tabi/uno.css`
- Public assets: Served directly from `public/` directory

This differs from production where everything goes to `dist/`.

### 7. No Caching Initially

The plan explicitly says:

> Initial implementation has no caching:
>
> - SSR bundles fresh every request
> - Client bundles fresh every request
> - UnoCSS generated fresh every request

This is intentional (KISS). Optimization can come later.

### 8. Route Registration

Following the `serve/server.ts` pattern:

```typescript
app.get(`${basePath}/__hot-reload`, handleWebSocket);
app.get(`${basePath}/__tabi/*`, serveClientBundles);
app.get(`${basePath}/__styles/uno.css`, serveUnoCSS);
app.get(`${basePath}/public/*`, servePublicAssets);
app.get(`${basePath}/*`, handlePageRequest);
```

Order matters - specific routes before wildcards.

### 9. Entry Code Generation

For SSR bundles, similar to client entry generation but renders inside bundle:

```typescript
// Generated SSR entry for TSX page
import { render } from "preact-render-to-string";
import {
  BasePathProvider,
  FrontmatterProvider,
} from "/abs/path/preact/context.tsx";
import { MarkdownCacheProvider } from "/abs/path/preact/markdown-cache.tsx";
import Layout0 from "/abs/path/pages/_layout.tsx";
import Page, { frontmatter } from "/abs/path/pages/blog/post.tsx";

function App() {
  return (
    <BasePathProvider basePath="">
      <MarkdownCacheProvider>
        <FrontmatterProvider frontmatter={frontmatter ?? {}}>
          <Layout0>
            <Page />
          </Layout0>
        </FrontmatterProvider>
      </MarkdownCacheProvider>
    </BasePathProvider>
  );
}

export const html = render(<App />);
export const pageType = "tsx";
export { frontmatter };
```

Import via data URL, extract exports, continue processing.

### 10. Framework Preact Directory

Multiple locations reference this:

```typescript
const preactDir = join(dirname(new URL(import.meta.url).pathname), "../preact");
```

This is the framework's Preact utilities, not user code. Needed for context
providers.

## Recommended Approach

Based on the comprehensive plan and existing patterns:

### Phase 1: Core Infrastructure (Testable Units)

1. **Create `dev/` module structure**
   ```
   dev/
   ├── mod.ts              # Export registerDevServer
   ├── types.ts            # DevServerOptions, DevServerState
   ├── hot-reload.ts       # WebSocket server
   ├── client-script.ts    # Hot reload client generation
   └── tests/
       ├── hot-reload.test.ts
       └── client-script.test.ts
   ```

2. **Implement `hot-reload.ts`**
   - WebSocket server using Deno's native WebSocket upgrade
   - Connection tracking (Set of WebSocket instances)
   - Broadcast methods: `reload()`, `sendError(message, stack?)`
   - Cleanup method: `close()`
   - Test with mock WebSocket connections

3. **Implement `client-script.ts`**
   - Generate hot reload script as string
   - Include basePath in WebSocket URL
   - Reconnect logic on disconnect
   - Message handling for reload and error types
   - Test output format

### Phase 2: SSR Bundling (Critical Path)

4. **Implement `ssr-bundler.ts`**
   - Function: `bundleAndRenderSSR(options: SSROptions): Promise<SSRResult>`
   - Generate entry code (similar to client entry but with SSR render)
   - esbuild with `stdin`, `write: false`, no externals (bundle everything)
   - Import via data URL
   - Extract `html`, `frontmatter`, `pageType` exports
   - Handle both TSX and markdown pages
   - Test with fixture pages

### Phase 3: Error Handling

5. **Implement `error-overlay.tsx`**
   - Generate complete HTML document with error
   - Inline styles (no external CSS)
   - Display error message and stack trace
   - Include hot reload script for auto-recovery
   - Test rendering with various error types

### Phase 4: Server Orchestration

6. **Implement `server.ts`**
   - Function:
     `registerDevServer(app: TabiApp, options, basePath): Promise<() => void>`
   - Initialize state (manifest, hot reload server, watcher)
   - Register routes (in order):
     - `/__hot-reload` - WebSocket upgrade
     - `/__tabi/*` - Client bundles (in-memory)
     - `/__styles/uno.css` - UnoCSS
     - `/public/*` - Public assets
     - `/*` - Page handler
   - Page request flow:
     - Find page in manifest
     - Bundle SSR and render
     - Post-process HTML (markdown markers, head markers)
     - Bundle client JS
     - Generate UnoCSS (if config exists)
     - Assemble final HTML with scripts
     - Inject hot reload script
     - Return response
   - File watcher integration:
     - Call `watchPages()`
     - On change: categorize, invalidate manifest if needed, send reload
   - Return cleanup function that stops watcher and hot reload server
   - Integration tests with test fixture app

### Phase 5: Integration

7. **Update `pages/factory.ts`**
   - Import `registerDevServer` from `dev/mod.ts`
   - Implement `dev()` function:
     ```typescript
     async function dev(app: TabiApp, options: DevOptions = {}): Promise<void> {
       const pagesDir = resolve(options.pagesDir ?? DEFAULT_PAGES_DIR);
       const rootDir = dirname(pagesDir);

       const cleanup = await registerDevServer(app, {
         rootDir,
         pagesDir: "pages",
       }, basePath);

       // Store cleanup for graceful shutdown
       // (Consider: How to expose cleanup to user? Process signal handlers?)
     }
     ```

8. **Testing**
   - Unit tests for each component
   - Integration test with example app
   - Manual testing with hot reload
   - Test error scenarios

### Key Implementation Details

**SSR Bundle Entry Generation** (TSX):

```typescript
function generateSSREntry(
  page: PageEntry,
  layouts: string[],
  preactDir: string,
  basePath: string,
): string {
  const lines = [];
  lines.push('import { render } from "preact-render-to-string";');
  lines.push(
    `import { BasePathProvider, FrontmatterProvider } from "${preactDir}/context.tsx";`,
  );
  lines.push(
    `import { MarkdownCacheProvider } from "${preactDir}/markdown-cache.tsx";`,
  );

  layouts.forEach((path, i) => {
    lines.push(`import Layout${i} from "${path}";`);
  });

  lines.push(`import Page, { frontmatter } from "${page.filePath}";`);

  // Compose tree
  lines.push("function App() {");
  lines.push("  return (");
  lines.push(`    <BasePathProvider basePath="${basePath}">`);
  lines.push("      <MarkdownCacheProvider>");
  lines.push("        <FrontmatterProvider frontmatter={frontmatter ?? {}}>");
  layouts.forEach((_, i) => lines.push(`          <Layout${i}>`));
  lines.push("            <Page />");
  layouts.forEach((_, i) => lines.push(`          </Layout${i}>`));
  lines.push("        </FrontmatterProvider>");
  lines.push("      </MarkdownCacheProvider>");
  lines.push("    </BasePathProvider>");
  lines.push("  );");
  lines.push("}");

  lines.push("export const html = render(<App />);");
  lines.push('export const pageType = "tsx";');
  lines.push("export { frontmatter };");

  return lines.join("\n");
}
```

**SSR Bundle and Import**:

```typescript
async function bundleAndRenderSSR(options: SSROptions): Promise<SSRResult> {
  const entryCode = generateSSREntry(...);
  
  const result = await esbuild.build({
    stdin: { contents: entryCode, loader: "tsx", resolveDir: options.projectRoot },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "preact",
    minify: false,
    sourcemap: "inline",
  });
  
  const code = result.outputFiles[0].text;
  const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
  const module = await import(dataUrl);
  
  return {
    html: module.html,
    frontmatter: module.frontmatter ?? {},
    pageType: module.pageType,
  };
}
```

**Hot Reload WebSocket**:

```typescript
interface HotReloadServer {
  handleUpgrade(c: TabiContext): void;
  reload(): void;
  sendError(message: string, stack?: string): void;
  close(): void;
}

function createHotReloadServer(): HotReloadServer {
  const clients = new Set<WebSocket>();

  return {
    handleUpgrade(c) {
      const { socket, response } = Deno.upgradeWebSocket(c.req.raw);
      clients.add(socket);
      socket.onclose = () => clients.delete(socket);
      return response;
    },

    reload() {
      broadcast({ type: "reload" });
    },

    sendError(message, stack) {
      broadcast({ type: "error", message, stack });
    },

    close() {
      for (const socket of clients) {
        socket.close();
      }
      clients.clear();
    },
  };

  function broadcast(data: unknown) {
    const message = JSON.stringify(data);
    for (const socket of clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }
}
```

**Page Request Handler**:

```typescript
async function handlePageRequest(
  c: TabiContext,
  state: DevServerState,
): Response {
  try {
    // 1. Get or rebuild manifest
    if (!state.manifest) {
      state.manifest = await scanPages({ rootDir, pagesDir });
    }

    // 2. Find page
    const route = c.req.path;
    const pageEntry = state.manifest.pages.find((p) => p.route === route);
    if (!pageEntry) {
      return handleNotFound(c, state);
    }

    // 3. Load layouts
    const layouts = await loadLayoutChain(pageEntry.layoutChain);

    // 4. Bundle and render SSR
    const ssrResult = await bundleAndRenderSSR({
      pagePath: pageEntry.filePath,
      layoutPaths: pageEntry.layoutChain,
      projectRoot: state.rootDir,
      preactDir: state.preactDir,
      basePath: state.basePath,
    });

    // 5. Post-process (markdown, head)
    const { html: bodyAfterMarkdown, cache: markdownCache } =
      await processMarkdownMarkers(ssrResult.html);
    const { head: headContent, html: bodyWithoutHead } = processHeadMarkers(
      bodyAfterMarkdown,
    );

    // 6. Bundle client JS (in-memory, write to .tabi/client/)
    const clientBundle = await bundleClient({
      page: {
        type: ssrResult.pageType,
        frontmatter: ssrResult.frontmatter,
        filePath: pageEntry.filePath,
      },
      layouts,
      route,
      outDir: join(state.rootDir, ".tabi/client"),
      mode: "development",
      projectRoot: state.rootDir,
      basePath: state.basePath,
    });

    // 7. Generate UnoCSS if config exists
    let unoCss = "";
    if (state.manifest.systemFiles.unoConfig) {
      const result = await compileUnoCSS({
        configPath: state.manifest.systemFiles.unoConfig,
        projectRoot: state.rootDir,
        outDir: join(state.rootDir, ".tabi"),
        basePath: state.basePath,
      });
      if (result.css) {
        unoCss = `<link rel="stylesheet" href="${result.publicPath}">`;
      }
    }

    // 8. Assemble final HTML
    const dataScript = serializePageData(
      { type: ssrResult.pageType, frontmatter: ssrResult.frontmatter },
      route,
      markdownCache,
      state.basePath,
    );
    const bundleScript =
      `<script type="module" src="${clientBundle.publicPath}"></script>`;
    const hotReloadScript = generateHotReloadScript(state.basePath);

    const bodyContent = `
      <div id="__tabi__">${bodyWithoutHead}</div>
      ${dataScript}
      ${bundleScript}
      <script>${hotReloadScript}</script>
    `;

    const Document = DefaultDocument; // Or custom from systemFiles.html
    const documentHtml = render(<Document head={null}>{bodyContent}</Document>);
    const finalHtml = injectHeadContent(documentHtml, headContent + unoCss);

    return c.html(`<!DOCTYPE html>${finalHtml}`);
  } catch (error) {
    // Send error to WebSocket clients
    state.hotReload.sendError(error.message, error.stack);

    // Return error overlay
    const errorHtml = renderErrorOverlay(
      error,
      route,
      generateHotReloadScript(state.basePath),
    );
    return c.html(errorHtml, 500);
  }
}
```

## Open Questions

None - research is sufficient to proceed.

The existing plan (`docs/plans/dev-server.md`) is comprehensive and
well-thought-out. Combined with the codebase patterns and ADR-004's critical
context on the Deno caching issue, the implementation path is clear.

Key success factors:

1. Follow the plan's implementation order (bottom-up)
2. Use data URL imports for SSR bundles (non-negotiable per ADR-004)
3. Keep initial implementation simple (no caching, full reloads)
4. Write tests for each component before integration
5. Follow existing patterns for route registration, bundling, and rendering

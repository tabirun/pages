# Dev Server Plan

## Overview

Implement the `dev()` function returned by `pages()` to provide a development
server with hot reload and fresh SSR on every request.

## Problem

Deno caches dynamic imports. Even with cache-busting timestamps on direct
imports, user imports within those files remain cached. See ADR-004 for full
context.

**Solution**: Use esbuild to bundle user code for SSR, rendering inside the
bundle. Import the bundle via data URL to bypass Deno's module cache entirely.

## Architecture

### New Module: `dev/`

```
dev/
├── mod.ts              # Export: registerDevServer
├── server.ts           # Main dev server registration
├── types.ts            # DevServerOptions, DevServerState
├── hot-reload.ts       # WebSocket server for reload/error events
├── ssr-bundler.ts      # esbuild SSR bundle generation
├── error-overlay.tsx   # Error display component (inline styles)
├── client-script.ts    # Hot reload client script
└── tests/
    ├── hot-reload.test.ts
    ├── ssr-bundler.test.ts
    └── server.test.ts
```

### Components

#### 1. Hot Reload Server (`hot-reload.ts`)

WebSocket server for communicating with browser clients.

```typescript
interface HotReloadServer {
  /** Handle WebSocket upgrade request */
  handleUpgrade(c: TabiContext): void;
  /** Send reload signal to all connected clients */
  reload(): void;
  /** Send error to clients (displays overlay) */
  sendError(message: string, stack?: string): void;
  /** Close all connections and clean up */
  close(): void;
}

function createHotReloadServer(): HotReloadServer;
```

**WebSocket Protocol:**

| Message                              | Direction       | Purpose             |
| ------------------------------------ | --------------- | ------------------- |
| `{ type: "reload" }`                 | Server → Client | Trigger page reload |
| `{ type: "error", message, stack? }` | Server → Client | Show error overlay  |

#### 2. SSR Bundler (`ssr-bundler.ts`)

Bundles and executes SSR, returning rendered HTML.

```typescript
interface SSRResult {
  /** Rendered HTML string (before post-processing) */
  html: string;
  /** Page frontmatter */
  frontmatter: Record<string, unknown>;
  /** Page type */
  pageType: "markdown" | "tsx";
}

interface SSROptions {
  /** Absolute path to page file */
  pagePath: string;
  /** Absolute paths to layout files (root to innermost) */
  layoutPaths: string[];
  /** Absolute path to project root */
  projectRoot: string;
  /** Absolute path to framework preact directory */
  preactDir: string;
  /** Base path for the site */
  basePath: string;
}

async function bundleAndRenderSSR(options: SSROptions): Promise<SSRResult>;
```

**Generated SSR Entry (TSX pages):**

```typescript
import { render } from "preact-render-to-string";
import {
  BasePathProvider,
  FrontmatterProvider,
} from "/abs/path/preact/context.tsx";
import { MarkdownCacheProvider } from "/abs/path/preact/markdown-cache.tsx";
import Layout0 from "/abs/path/pages/_layout.tsx";
import Layout1 from "/abs/path/pages/blog/_layout.tsx";
import Page, { frontmatter } from "/abs/path/pages/blog/post.tsx";

function App() {
  return (
    <BasePathProvider basePath="">
      <MarkdownCacheProvider>
        <FrontmatterProvider frontmatter={frontmatter ?? {}}>
          <Layout0>
            <Layout1>
              <Page />
            </Layout1>
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

**Generated SSR Entry (Markdown pages):**

```typescript
import { render } from "preact-render-to-string";
import {
  BasePathProvider,
  FrontmatterProvider,
} from "/abs/path/preact/context.tsx";
import { MarkdownCacheProvider } from "/abs/path/preact/markdown-cache.tsx";
import { Markdown } from "/abs/path/preact/markdown.tsx";
import Layout0 from "/abs/path/pages/_layout.tsx";

export const frontmatter = { title: "...", description: "..." };
const markdownContent = `# Page Content\n\nMarkdown here...`;

function App() {
  return (
    <BasePathProvider basePath="">
      <MarkdownCacheProvider>
        <FrontmatterProvider frontmatter={frontmatter}>
          <Layout0>
            <Markdown>{markdownContent}</Markdown>
          </Layout0>
        </FrontmatterProvider>
      </MarkdownCacheProvider>
    </BasePathProvider>
  );
}

export const html = render(<App />);
export const pageType = "markdown";
```

**esbuild Configuration:**

```typescript
{
  stdin: {
    contents: entryCode,
    loader: "tsx",
    resolveDir: projectRoot,
  },
  bundle: true,
  write: false,  // In-memory output
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "preact",
  minify: false,
  sourcemap: "inline",
}
```

**Import via Data URL:**

```typescript
const result = await esbuild.build(config);
const code = result.outputFiles[0].text;
const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
const module = await import(dataUrl);
return {
  html: module.html,
  frontmatter: module.frontmatter ?? {},
  pageType: module.pageType,
};
```

#### 3. Error Overlay (`error-overlay.tsx`)

Renders error with inline styles. Includes hot reload script for recovery.

```typescript
function renderErrorOverlay(
  error: Error,
  filePath?: string,
  hotReloadScript: string,
): string;
```

Returns complete HTML document with:

- Red error banner
- Error message
- Stack trace (monospace, scrollable)
- File path context
- Hot reload script (so page reloads when user fixes error)

#### 4. Client Script (`client-script.ts`)

Generates the hot reload client script to inject into pages.

```typescript
function generateHotReloadScript(basePath: string): string;
```

Generated script:

```javascript
(function () {
  const ws = new WebSocket(
    (location.protocol === "https:" ? "wss:" : "ws:") +
      "//" + location.host + "${basePath}/__hot-reload",
  );
  ws.onmessage = function (e) {
    const msg = JSON.parse(e.data);
    if (msg.type === "reload") {
      location.reload();
    }
    if (msg.type === "error") {
      // Show simple error overlay
      // (or rely on full page error response)
    }
  };
  ws.onclose = function () {
    // Attempt reconnect after delay
    setTimeout(function () {
      location.reload();
    }, 1000);
  };
})();
```

#### 5. Dev Server State (`types.ts`)

```typescript
interface DevServerOptions {
  /** Directory containing page files. Defaults to "./pages". */
  pagesDir?: string;
}

interface DevServerState {
  /** Resolved absolute paths */
  rootDir: string;
  pagesDir: string;
  publicDir: string;
  basePath: string;

  /** Cached manifest - invalidated on structure changes */
  manifest: PageManifest | null;

  /** Hot reload server instance */
  hotReload: HotReloadServer;

  /** File watcher cleanup function */
  stopWatcher: (() => void) | null;
}
```

#### 6. Main Server (`server.ts`)

```typescript
async function registerDevServer(
  app: TabiApp,
  options: DevServerOptions,
  basePath: string,
): Promise<() => Promise<void>>;
```

**Registered Routes:**

| Route                             | Handler           | Purpose                    |
| --------------------------------- | ----------------- | -------------------------- |
| `{basePath}/__hot-reload`         | WebSocket upgrade | Hot reload connection      |
| `{basePath}/__dev-bundles/*`      | Serve JS          | Client bundles (in memory) |
| `{basePath}/__dev-styles/uno.css` | Serve CSS         | Generated UnoCSS           |
| `{basePath}/public/*`             | Serve files       | Public assets              |
| `{basePath}/*`                    | Page handler      | On-demand page rendering   |

## Request Flows

### Page Request

```
GET /blog/post
    │
    ▼
Find page in manifest
    │
    ▼
Bundle SSR (esbuild → data URL → import)
    │
    ▼
Get { html, frontmatter, pageType }
    │
    ▼
Post-process HTML:
  - Process <tabi-markdown> markers
  - Extract <tabi-head> markers
    │
    ▼
Bundle client JS (in memory)
    │
    ▼
Generate UnoCSS (if config exists)
    │
    ▼
Assemble final HTML:
  - Wrap body in <div id="__tabi__">
  - Serialize page data to <script id="__TABI_DATA__">
  - Add client bundle <script>
  - Inject UnoCSS <link> (if exists)
  - Inject hot reload <script>
  - Wrap in document shell
    │
    ▼
Return HTML response
```

### File Change

```
File modified (watcher event)
    │
    ▼
Categorize: page | layout | system | code | unoConfig | publicAsset
    │
    ▼
If layout/system/code changed:
  - Invalidate manifest (force rescan)
    │
    ▼
Send reload to all clients
```

### Error Handling

```
Error during render
    │
    ▼
Send error to hot reload clients
    │
    ▼
Return error overlay HTML (with hot reload script)
    │
    ▼
User fixes code → file change → reload → retry
```

## Implementation Order

1. **`hot-reload.ts`** - WebSocket server
   - Connection management
   - Message broadcasting
   - Tests: connection, reload, error messages

2. **`ssr-bundler.ts`** - SSR bundle generation
   - Entry code generation (TSX and markdown)
   - esbuild bundling
   - Data URL import
   - Tests: entry generation, bundling, rendering

3. **`error-overlay.tsx`** - Error display
   - Inline-styled error page
   - Hot reload script inclusion
   - Tests: rendering with various errors

4. **`client-script.ts`** - Hot reload client
   - Script generation
   - Tests: script output

5. **`server.ts`** - Middleware orchestration
   - State initialization
   - Route registration
   - Page rendering flow
   - File watcher integration
   - Tests: integration tests with test app

6. **`mod.ts`** - Public export
   - Export `registerDevServer`

7. **Update `pages/factory.ts`**
   - Implement `dev()` function
   - Wire up to `registerDevServer`

## Design Decisions

### No Caching (KISS)

Initial implementation has no caching:

- SSR bundles fresh every request
- Client bundles fresh every request
- UnoCSS generated fresh every request

Optimization can come later if needed.

### No Externals in esbuild

Bundle everything including preact. Since rendering happens inside the bundle,
all code uses the same preact instance - contexts work correctly.

### Full Page Reload

No HMR (Hot Module Replacement). Every file change triggers full page reload.
Simpler to implement and debug.

### In-Memory Client Bundles

Client bundles stored in memory, not written to disk. Served on-demand from
`/__dev-bundles/*`.

### Inline Error Styles

Error overlay uses inline styles - no external CSS dependencies. Simple and
reliable.

## Future Optimizations (Not Now)

- SSR bundle caching with content hashing
- Client bundle caching
- UnoCSS caching with config mtime check
- Incremental esbuild rebuilds
- Code splitting for shared chunks

## Dependencies

Uses existing modules:

- `scanner/` - `scanPages`, `watchPages`
- `loaders/` - `loadMarkdownPage` (for frontmatter extraction)
- `bundler/` - `bundleClient`, `stopEsbuild`
- `markdown/` - `processMarkdownMarkers`
- `preact/` - `processHeadMarkers`
- `renderer/` - `serializePageData`, `DefaultDocument`
- `unocss/` - `compileUnoCSS`, `injectStylesheet`

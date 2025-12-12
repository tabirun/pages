# Plan: Simplified Dev Server

## Metadata

- **Task:** Implement a simplified dev server using subprocess-based page
  building to escape Deno's module cache
- **Branch:** feat/simplified-dev-server
- **Status:** IN_PROGRESS
- **Created:** 2025-12-12

## Summary

Build a minimal dev server with three files: server.ts
(HTTP/WebSocket/orchestration), build-page.ts (subprocess entry), and mod.ts
(public exports). Uses subprocess-based builds to escape Deno's module cache,
scanner for file watching, and WebSocket for full-page reload on changes. Keeps
it extremely simple - no fancy error overlays, no complex abstractions.

## Commits

### 1. Add subprocess page builder entry point

**Goal:** Create the subprocess entry point that builds a single page and
outputs result as JSON to stdout.

**Files:**

- Create: `dev/build-page.ts`

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

### 2. Add dev server with HTTP, WebSocket, and file watching

**Goal:** Create main dev server that handles page requests via subprocess,
manages WebSocket connections for HMR, integrates file watcher to broadcast
reload events, and builds UnoCSS on-the-fly.

**Files:**

- Create: `dev/server.ts`

**UnoCSS Integration:**

- Subprocess builds UnoCSS during page build (fresh styles every request)
- Inject UnoCSS stylesheet into HTML
- Watch `uno.config.ts` changes → trigger reload
- Any file change triggers reload → page rebuild includes fresh UnoCSS

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

### 3. Add dev module public exports

**Goal:** Export public API and integrate with pages factory.

**Files:**

- Create: `dev/mod.ts`
- Modify: `pages/factory.ts`

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

### 4. Add integration tests for dev server

**Goal:** Add end-to-end tests verifying page serving, WebSocket reload, file
watching, and error handling.

**Files:**

- Create: `dev/tests/integration.test.ts`
- Create: `dev/tests/fixtures/test-project/pages/index.tsx`
- Create: `dev/tests/fixtures/test-project/pages/_layout.tsx`

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

## Dependencies

- Scanner module (exists) - provides scanPages() and watchPages()
- Build module (exists) - patterns for loading pages, bundling, rendering
- Bundler module (exists) - provides bundleClient()
- Renderer module (exists) - provides renderPage()
- Loaders module (exists) - provides loadPage() and loadLayoutChain()
- TabiApp (exists) - HTTP framework for middleware registration

## Risks

- **Subprocess latency** - ~150-400ms per request acceptable for dev but could
  feel slow on complex pages
  - Mitigation: Document behavior, add optional caching in future if needed
- **Temp directory cleanup** - Bundle files written to temp directory need
  cleanup strategy
  - Mitigation: Use OS temp dir with process-specific subdirectory, cleanup on
    server shutdown
- **WebSocket reconnection** - Clients need to reconnect when server restarts
  - Mitigation: Simple exponential backoff in HMR client script

## Out of Scope

- Granular module updates (start with full-page reload only)
- CSS hot reload without page refresh (full reload rebuilds CSS)
- State preservation across reloads
- Build result caching (can add later if latency is an issue)
- Fancy error overlay UI (return errors as plain HTML)
- Pre-building system pages (_not-found, _error)
- Source map support in error stack traces

## Notes

### File Structure (3 files only)

```
dev/
├── mod.ts           # Public exports: registerDevServer
├── server.ts        # HTTP server + WebSocket + orchestration (all in one)
└── build-page.ts    # Subprocess entry point
```

### Key Constraints

1. **KISS principle** - User explicitly wants simple, not clever
2. **No separate types.ts** - Define types inline in server.ts
3. **No separate handlers.ts** - Keep request handlers in server.ts
4. **No separate websocket.ts** - WebSocket logic in server.ts
5. **Three files total** - mod.ts, server.ts, build-page.ts

### WebSocket Protocol

Simple typed message protocol:

```typescript
// Server → Client
type HMRMessage =
  | { type: "reload" }
  | { type: "ping" }; // for keepalive

// Future extensibility (not implementing now):
// | { type: "update"; modules: string[] }
// | { type: "css-update"; href: string }
```

### Subprocess Communication

build-page.ts outputs JSON to stdout:

```typescript
// Success
{
  "success": true,
  "html": string,
  "bundlePath": string,
  "bundlePublicPath": string
}

// Error
{
  "success": false,
  "error": string,
  "stack": string | undefined
}
```

### Error Handling Strategy

Simple HTML error responses:

```html
<!DOCTYPE html>
<html>
  <head><title>Build Error</title></head>
  <body>
    <h1>Build Error</h1>
    <pre>{error message}</pre>
    <pre>{stack trace if available}</pre>
  </body>
</html>
```

No fancy overlay, no error recovery - just show what broke.

### HMR Client Script

Inline at end of HTML body:

```javascript
<script>
(function() {
  const ws = new WebSocket('ws://localhost:8000/__ws');

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'reload') {
      window.location.reload();
    }
  };

  ws.onclose = () => {
    // Reconnect with exponential backoff
    setTimeout(() => window.location.reload(), 1000);
  };
})();
</script>
```

### Temp Directory Strategy

- Use `Deno.makeTempDir()` on server start
- Store bundles in `{tempDir}/bundles/`
- Clean up on server shutdown (when TabiApp stops)
- Don't clean up bundles between requests (OS will clean on reboot)

### Route Matching Strategy

1. Request comes in for route (e.g., `/blog/post`)
2. Find matching PageEntry from scanned manifest
3. If found, build page via subprocess
4. If not found, check for custom _not-found page and build it
5. If no custom 404, return simple 404 HTML

### BasePath Support

All routes respect basePath from factory config:

- Pages: `${basePath}/*`
- WebSocket: `${basePath}/__ws`
- Bundles: `${basePath}/__tabi/*`
- Public assets: `${basePath}/*` (via serveFiles)

### Public Assets

Use TabiApp's serveFiles middleware to serve public directory at basePath.
Register before page handler so static files take precedence.

### UnoCSS Support

Build UnoCSS on-the-fly during each page build:

- Subprocess compiles UnoCSS using `compileUnoCSS()` from `unocss/compiler.ts`
- Inject `<link>` or inline `<style>` into HTML
- Any file change (including `uno.config.ts`) triggers reload
- Fresh styles on every page request - no stale CSS

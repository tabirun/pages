# Dev Server Implementation Plan

## Summary

Implement a development server for the Tabi Pages framework that provides hot
reload capabilities and fresh server-side rendering on every request. The
critical challenge is bypassing Deno's module cache (which caches nested
imports) by using esbuild to bundle SSR code and importing it via data URLs.

The implementation follows a bottom-up approach: build testable components
first, integrate last.

## Commits

### Commit 1: feat(dev): add dev module types and hot reload server

**Goal**: Create foundation types for the dev module and implement the
WebSocket-based hot reload server with connection tracking and message
broadcasting.

**Files**:

- Create `dev/types.ts` - DevServerOptions, DevServerState, HotReloadMessage
  interfaces
- Create `dev/hot-reload.ts` - WebSocket server implementation
- Create `dev/tests/hot-reload.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 2: feat(dev): add hot reload client script generation

**Goal**: Implement the client-side script generator that creates WebSocket
connection code to be injected into pages, with reconnection logic and message
handling.

**Files**:

- Create `dev/client-script.ts` - generateHotReloadScript() function
- Create `dev/tests/client-script.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 3: feat(dev): add SSR entry code generation

**Goal**: Implement the SSR entry code generator that creates TypeScript/TSX
code strings for both TSX pages and Markdown pages, wrapping them in the proper
provider hierarchy and layout chain.

**Files**:

- Create `dev/ssr-entry.ts` - generateSSREntry() function
- Create `dev/tests/ssr-entry.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 4: feat(dev): add SSR bundler with data URL imports

**Goal**: Implement the core SSR bundling functionality using esbuild to bundle
entry code and import via data URLs, bypassing Deno's module cache entirely (as
per ADR-004).

**Files**:

- Create `dev/ssr-bundler.ts` - bundleSSR() function with data URL import
- Modify `dev/types.ts` - Add SSROptions, SSRResult interfaces
- Create `dev/tests/ssr-bundler.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 5: feat(dev): add error overlay component

**Goal**: Implement the error overlay HTML generator with inline styles for
displaying errors during development, including hot reload script for automatic
recovery.

**Files**:

- Create `dev/error-overlay.tsx` - renderErrorOverlay() function
- Create `dev/tests/error-overlay.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 6: feat(dev): add dev server request handlers

**Goal**: Implement the page request handler that orchestrates SSR bundling,
post-processing, client bundling, UnoCSS generation, and HTML assembly with hot
reload injection.

**Files**:

- Create `dev/handlers.ts` - handlePageRequest(), handleBundleRequest(),
  handleStylesRequest()
- Modify `dev/types.ts` - Add handler-related types if needed
- Create `dev/tests/handlers.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 7: feat(dev): add dev server registration and file watching

**Goal**: Implement the main dev server registration function that initializes
state, registers all routes, and sets up file watching with manifest
invalidation logic.

**Files**:

- Create `dev/server.ts` - registerDevServer() function
- Create `dev/tests/server.test.ts` - Unit tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 8: feat(dev): add dev module public exports

**Goal**: Create the dev module's public export file and expose the
registerDevServer function.

**Files**:

- Create `dev/mod.ts` - Public exports

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 9: feat(dev): wire dev server into pages factory

**Goal**: Integrate the dev server into the pages() factory function, replacing
the stub implementation with the full dev server registration.

**Files**:

- Modify `pages/factory.ts` - Implement dev() function using registerDevServer

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

### Commit 10: test(dev): add integration tests

**Goal**: Add integration tests using the example apps to verify the complete
dev server flow including hot reload, error recovery, and page rendering.

**Files**:

- Create `dev/tests/integration.test.ts` - End-to-end tests

**Checklist**:

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

---

## Architecture Notes

### Critical: Deno Module Cache Bypass (ADR-004)

The entire dev server architecture depends on this solution:

- Deno caches all dynamic imports, including transitive dependencies
- Cache-busting import URLs doesn't help with nested user imports
- **Solution**: Bundle SSR code with esbuild, import via data URL

```typescript
const result = await esbuild.build({
  stdin: { contents: entryCode },
  write: false,
});
const code = result.outputFiles[0].text;
const dataUrl = `data:text/javascript;base64,${btoa(code)}`;
const module = await import(dataUrl);
```

### Route Registration Order

Routes must be registered specific-to-general:

1. `/__hot-reload` - WebSocket upgrade
2. `/__dev-bundles/*` - Client bundles
3. `/__dev-styles/uno.css` - UnoCSS
4. `/public/*` - Public assets
5. `/*` - Page handler (catch-all)

### Design Decisions

- **No caching**: Keep it simple initially, optimize later if needed
- **Full page reload**: No HMR, just reload on any change
- **In-memory bundles**: Don't write to disk in dev mode
- **Fail gracefully**: All errors show overlay with hot reload for auto-recovery

## Out of Scope

- HMR (Hot Module Replacement)
- Bundle caching or optimization
- Incremental esbuild rebuilds
- Code splitting
- Source maps

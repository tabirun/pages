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

- Create `dev/types.ts` - DevServerOptions, DevServerState, HotReloadMessage,
  SSROptions, SSRResult interfaces
- Create `dev/hot-reload.ts` - WebSocket server implementation
- Create `dev/tests/hot-reload.test.ts` - Unit tests

**Checklist**:

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** f1f1496

---

### Commit 2: feat(dev): add hot reload client script generation

**Goal**: Implement the client-side script generator that creates WebSocket
connection code to be injected into pages, with reconnection logic and message
handling.

**Files**:

- Create `dev/client-script.ts` - generateHotReloadScript() function
- Create `dev/tests/client-script.test.ts` - Unit tests

**Checklist**:

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** a7de0d6

---

### Commit 3: feat(dev): add SSR entry code generation

**Goal**: Implement the SSR entry code generator that creates TypeScript/TSX
code strings for both TSX pages and Markdown pages, wrapping them in the proper
provider hierarchy and layout chain. Must handle both page types differently:

- **TSX pages**: Import component, export frontmatter
- **Markdown pages**: Read content at bundle time, wrap in Markdown component

**Files**:

- Create `dev/ssr-entry.ts` - generateSSREntry() function for both page types
- Create `dev/tests/ssr-entry.test.ts` - Unit tests for TSX and markdown

**Checklist**:

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** 20b874e

---

### Commit 4: feat(dev): add SSR bundler with data URL imports

**Goal**: Implement the core SSR bundling functionality using esbuild to bundle
entry code and import via data URLs, bypassing Deno's module cache entirely (as
per ADR-004).

**Files**:

- Create `dev/ssr-bundler.ts` - bundleSSR() function with data URL import
- Create `dev/tests/ssr-bundler.test.ts` - Unit tests

**Checklist**:

- [x] Dev
- [x] Review
- [ ] Present
- [ ] Commit

---

### Commit 5: feat(dev): add error overlay component

**Goal**: Implement the error overlay HTML generator with inline styles for
displaying errors during development, including hot reload script for automatic
recovery.

**Files**:

- Create `dev/error-overlay.ts` - renderErrorOverlay() function (plain TS, no
  JSX needed for string generation)
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

- Create `dev/handlers.ts` - handlePageRequest(), handleNotFound(),
  handleError()
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
invalidation logic. Returns cleanup function for graceful shutdown.

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
the stub implementation with the full dev server registration. Store cleanup
handle for potential graceful shutdown.

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

Routes must be registered specific-to-general (basePath-aware):

1. `{basePath}/__hot-reload` - WebSocket upgrade
2. `{basePath}/__tabi/*` - Client bundles (matches production path)
3. `{basePath}/__styles/uno.css` - UnoCSS
4. `{basePath}/public/*` - Public assets (direct from source)
5. `{basePath}/*` - Page handler (catch-all)

### SSR Entry Generation by Page Type

**TSX Pages**:

```typescript
import { render } from "preact-render-to-string";
import { BasePathProvider, FrontmatterProvider } from "{preactDir}/context.tsx";
import Layout0 from "{layoutPath}";
import Page, { frontmatter } from "{pagePath}";

function App() {
  return (
    <BasePathProvider basePath="{basePath}">
      <FrontmatterProvider frontmatter={frontmatter ?? {}}>
        <Layout0>
          <Page />
        </Layout0>
      </FrontmatterProvider>
    </BasePathProvider>
  );
}

export const html = render(<App />);
export const pageType = "tsx";
export { frontmatter };
```

**Markdown Pages**:

```typescript
import { render } from "preact-render-to-string";
import { BasePathProvider, FrontmatterProvider } from "{preactDir}/context.tsx";
import { Markdown } from "{preactDir}/markdown.tsx";
import Layout0 from "{layoutPath}";

const frontmatter = { frontmatterJson };
const content = `{markdownContent}`;

function App() {
  return (
    <BasePathProvider basePath="{basePath}">
      <FrontmatterProvider frontmatter={frontmatter}>
        <Layout0>
          <Markdown>{content}</Markdown>
        </Layout0>
      </FrontmatterProvider>
    </BasePathProvider>
  );
}

export const html = render(<App />);
export const pageType = "markdown";
export { content, frontmatter };
```

### Manifest Invalidation Strategy

**Invalidate manifest** (force rescan) on:

- Layout changes (affects layout chains)
- System file changes (_html, _not-found, _error)
- Code changes outside pages/ (could affect any importer)
- Page create/delete (structural change)

**Don't invalidate** on:

- Single page content update (only affects that page)
- Public asset changes (no impact on manifest)
- UnoCSS config changes (rebuild CSS, don't rescan)

### Design Decisions

- **No caching**: Keep it simple initially, optimize later if needed
- **Full page reload**: No HMR, just reload on any change
- **In-memory SSR bundles**: Via data URL import, never written to disk
- **Client bundles to .tabi/**: Written for esbuild to resolve, cleaned on start
- **Fail gracefully**: All errors show overlay with hot reload for auto-recovery
- **Cleanup function**: registerDevServer returns () => void for shutdown

### Post-Processing Pipeline (reuse from renderer)

After SSR bundle returns HTML:

1. `processMarkdownMarkers()` - Render markdown to HTML, build cache
2. `processHeadMarkers()` - Extract `<Head>` content
3. `serializePageData()` - Create `__TABI_DATA__` script
4. Inject client bundle script
5. Inject hot reload script
6. Inject UnoCSS link (if config exists)
7. Assemble document with DefaultDocument

## Out of Scope

- HMR (Hot Module Replacement)
- Bundle caching or optimization
- Incremental esbuild rebuilds
- Code splitting
- Source maps

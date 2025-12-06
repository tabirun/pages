# Renderer Module

## Status

Pending

## Summary

The renderer module is the core SSR pipeline that produces final HTML from
loaded pages and layouts. It sits between the existing modules (scanner,
loaders, markdown, preact) and the factory functions (dev, build, serve).

## Dependencies

Requires (already implemented):

- `loaders` - Load pages and layouts (used by build, not dev per ADR-004)
- `markdown` - Process markdown content
- `preact` - FrontmatterProvider, Head, processHeadMarkers

Enables (not yet implemented):

- `build()` - Static HTML generation (uses loaders directly)
- `dev()` - SSR responses with hot reload (uses SSR bundler per ADR-004)

## Design Principle

The renderer accepts `LoadedPage` and `LoadedLayout[]` regardless of source:

- **Production build:** Components from loaders (direct Deno imports)
- **Dev mode:** Components from SSR bundle (esbuild via data URL per ADR-004)

The orchestrator adapts SSR bundle output to renderer input. Renderer stays
simple and testable.

## Responsibilities

1. **Compose layouts** - Nest page content within layout chain
2. **Render to HTML** - Use preact-render-to-string
3. **Process markers** - Handle `<tabi-markdown>` and `<tabi-head>`
4. **Generate document** - Produce full HTML with doctype, head, body
5. **Serialize data** - Inject `__TABI_DATA__` script for hydration

## API Design

```ts
import { renderPage } from "@tabirun/pages/renderer";

const result = await renderPage({
  page: loadedPage, // From loadPage()
  layouts: loadedLayouts, // From loadLayout() in chain order
  clientBundlePath, // From bundler (build) or deterministic (dev)
  route: "/blog/post",
});

// result.html - Full HTML document string
```

The `clientBundlePath` is provided by the caller:

- **Build mode:** Bundler returns hashed paths (e.g.,
  `/_tabi/blog/post-a1b2c3.js`)
- **Dev mode:** Deterministic paths without hash (e.g., `/_tabi/blog/post.js`)

### Types

```ts
interface RenderPageOptions {
  /** Loaded page (markdown or TSX). */
  page: LoadedPage;
  /** Layout chain from root to innermost. */
  layouts: LoadedLayout[];
  /** Path to client bundle for hydration script. */
  clientBundlePath: string;
  /** Route path for serialized data. */
  route: string;
  /** Custom document component (optional). */
  document?: ComponentType<DocumentProps>;
}

interface RenderPageResult {
  /** Complete HTML document. */
  html: string;
}

interface DocumentProps {
  /** Content for <head>. */
  head: ComponentChildren;
  /** SSR rendered body content. */
  children: ComponentChildren;
  /** Serialized page data script. */
  dataScript: string;
  /** Client bundle script tag. */
  bundleScript: string;
}
```

## Implementation

### Step 1: Compose Content Tree

Build the Preact component tree by nesting page inside layouts:

```tsx
function composeTree(
  page: LoadedPage,
  layouts: LoadedLayout[],
): ComponentType {
  // Page content - either TSX component or markdown wrapper
  let content: VNode;
  if (page.type === "tsx") {
    content = <page.component />;
  } else {
    content = <Markdown>{page.content}</Markdown>;
  }

  // Wrap in layouts from innermost to outermost
  for (let i = layouts.length - 1; i >= 0; i--) {
    const Layout = layouts[i].component;
    content = <Layout>{content}</Layout>;
  }

  // Wrap in FrontmatterProvider
  return () => (
    <FrontmatterProvider frontmatter={page.frontmatter}>
      {content}
    </FrontmatterProvider>
  );
}
```

### Step 2: Render to String

```tsx
import { render } from "preact-render-to-string";

const Tree = composeTree(page, layouts);
const bodyHtml = render(<Tree />);
```

### Step 3: Process Markers

```tsx
import { processMarkdownMarkers } from "@tabirun/pages/markdown";
import { processHeadMarkers } from "@tabirun/pages/preact";

// Process markdown markers (sync - highlighter pre-configured)
const { html: processedBody } = await processMarkdownMarkers(bodyHtml);

// Extract head content
const { html: finalBody, headContent } = processHeadMarkers(processedBody);
```

### Step 4: Generate Document

Default document structure per ADR-005:

```tsx
function DefaultDocument({
  head,
  children,
  dataScript,
  bundleScript,
}: DocumentProps): JSX.Element {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {head}
      </head>
      <body>
        <div id="__tabi__">{children}</div>
        {dataScript}
        {bundleScript}
      </body>
    </html>
  );
}
```

### Step 5: Serialize Data

Per ADR-005, serialize page data for hydration:

```tsx
function serializePageData(page: LoadedPage, route: string): string {
  const data = {
    frontmatter: page.frontmatter,
    route,
    pageType: page.type,
  };

  const json = JSON.stringify(data);
  const escaped = escapeHtml(json);

  return `<script id="__TABI_DATA__" type="application/json">${escaped}</script>`;
}
```

### Complete Flow

```tsx
export async function renderPage(
  options: RenderPageOptions,
): Promise<RenderPageResult> {
  const { page, layouts, clientBundlePath, route, document } = options;

  // 1. Compose tree
  const Tree = composeTree(page, layouts);

  // 2. Render body
  const rawBody = render(<Tree />);

  // 3. Process markdown markers
  const { html: markdownProcessed } = await processMarkdownMarkers(rawBody);

  // 4. Extract head markers
  const { html: body, headContent } = processHeadMarkers(markdownProcessed);

  // 5. Serialize data
  const dataScript = serializePageData(page, route);
  const bundleScript =
    `<script type="module" src="${clientBundlePath}"></script>`;

  // 6. Render document
  const Document = document ?? DefaultDocument;
  const html = "<!DOCTYPE html>" + render(
    <Document
      head={<>{headContent}</>}
      dataScript={dataScript}
      bundleScript={bundleScript}
    >
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </Document>,
  );

  return { html };
}
```

## File Structure

```
renderer/
├── mod.ts              # Public exports
├── renderer.ts         # renderPage implementation
├── compose.ts          # composeTree helper
├── document.tsx        # DefaultDocument component
├── serialize.ts        # serializePageData helper
├── types.ts            # Type definitions
└── tests/
    ├── renderer.test.ts
    ├── compose.test.ts
    └── document.test.ts
```

## Testing Strategy

### Unit Tests

1. **compose.test.ts**
   - Composes TSX page with no layouts
   - Composes TSX page with single layout
   - Composes TSX page with multiple layouts (correct nesting order)
   - Composes markdown page with layouts
   - FrontmatterProvider wraps content

2. **document.test.ts**
   - Default document has correct structure
   - Head content injected correctly
   - Data script and bundle script included
   - Custom document component used when provided

3. **serialize.test.ts**
   - Serializes frontmatter correctly
   - Escapes HTML in JSON
   - Includes route and pageType

### Integration Tests

1. **renderer.test.ts**
   - Full render of markdown page produces valid HTML
   - Full render of TSX page produces valid HTML
   - Markdown markers processed
   - Head markers extracted and injected
   - `__TABI_DATA__` script present with correct data
   - Client bundle script present
   - Custom document component works

### Test Fixtures

Create test fixtures:

```
renderer/tests/fixtures/
├── pages/
│   ├── simple.md
│   └── interactive.tsx
└── layouts/
    ├── root.tsx
    └── blog.tsx
```

## Edge Cases

1. **No layouts** - Page renders without layout wrapping
2. **Empty frontmatter** - Default empty object serialized
3. **Special characters in content** - HTML properly escaped
4. **Large markdown** - No performance issues with marker processing
5. **Nested Head components** - All head content collected

## Integration Points

### With Scanner

Scanner provides `layoutChain` for each page - array of layout file paths from
root to innermost. Renderer expects loaded layouts in same order.

### With Loaders (Production Build Only)

In production build, loaders work directly - no module caching issue:

```ts
const page = await loadPage(pageEntry.filePath);
const layouts = await Promise.all(
  pageEntry.layoutChain.map((path, i) => loadLayout(path, dirname(path))),
);
```

### With SSR Bundler (Dev Mode)

Per ADR-004, dev mode bypasses loaders due to Deno's module caching. The SSR
bundle exports components directly:

```ts
// SSR bundle exports (from esbuild via data URL)
interface SSRModule {
  Layout0?: ComponentType<LayoutProps>;
  Layout1?: ComponentType<LayoutProps>;
  // ... more layouts
  Page?: ComponentType; // TSX pages only
  frontmatter: PageFrontmatter;
  markdownContent?: string; // Markdown pages only
}
```

The dev orchestrator converts SSR bundle output to renderer input:

```ts
// Dev mode: import SSR bundle, adapt to renderer interface
const ssrModule = await importSSRBundle(pageEntry);

// Extract layouts in order (Layout0, Layout1, ...)
const layouts: LoadedLayout[] = [];
let i = 0;
while (ssrModule[`Layout${i}`]) {
  layouts.push({
    component: ssrModule[`Layout${i}`],
    filePath: pageEntry.layoutChain[i],
    directory: dirname(pageEntry.layoutChain[i]),
  });
  i++;
}

// Build page object
const page: LoadedPage = ssrModule.markdownContent
  ? {
    type: "markdown",
    frontmatter: ssrModule.frontmatter,
    content: ssrModule.markdownContent,
    filePath: pageEntry.filePath,
  }
  : {
    type: "tsx",
    frontmatter: ssrModule.frontmatter,
    component: ssrModule.Page!,
    filePath: pageEntry.filePath,
  };

// Now render - same interface for both modes
const { html } = await renderPage({ page, layouts, clientBundlePath, route });
```

This keeps the renderer interface clean - it doesn't know or care whether
components came from loaders or SSR bundles.

### With Bundler

The renderer receives `clientBundlePath` as input - it doesn't generate bundles.
This is intentional: **bundle first, render second**.

**Build mode:**

```ts
// 1. Scan all pages
const manifest = await scanPages({ rootDir });

// 2. Bundle ALL client entries (produces hashed filenames)
const bundleManifest = await bundleAllClientEntries(manifest.pages);
// bundleManifest: Map<route, hashedPath>
// e.g., "/blog/post" → "/_tabi/blog/post-a1b2c3.js"

// 3. Render each page with its bundle path
for (const pageEntry of manifest.pages) {
  const page = await loadPage(pageEntry.filePath);
  const layouts = await loadLayouts(pageEntry.layoutChain);

  const { html } = await renderPage({
    page,
    layouts,
    clientBundlePath: bundleManifest.get(pageEntry.route)!,
    route: pageEntry.route,
  });

  await writeFile(outPath, html);
}
```

**Dev mode:**

No content hashing - paths are deterministic:

```ts
// Path is predictable: /_tabi/{route}.js
const clientBundlePath = `/_tabi${route}.js`;

const { html } = await renderPage({
  page,
  layouts,
  clientBundlePath,
  route,
});
```

The renderer stays simple - orchestration logic lives in build/dev.

### With Build

Build calls `renderPage()` for each discovered page and writes result to disk.

### With Dev

Dev calls `renderPage()` on each request (with SSR bundling per ADR-004).

## Open Questions

### 1. _document.tsx Support

Should we support custom `_document.tsx` in this phase?

**Recommendation:** Yes, but optional. Scanner already detects it. Loader can
import it. Renderer passes as `document` option.

### 2. _404.tsx and _error.tsx

Should renderer handle error pages?

**Recommendation:** Defer. Error pages are rendered the same way - just
different page input. Build/dev handle when to use them.

### 3. Async Components

Should renderer support async page/layout components?

**Recommendation:** No. Keep components synchronous. Data fetching is not in
scope (per vision.md non-goals).

## Future Considerations

- **Streaming SSR** - Could use preact-render-to-string async mode
- **Partial hydration** - Would require changes to document structure
- **CSS extraction** - Could collect styles during render

## Related

- ADR-003: Universal Hydration
- ADR-005: Client Bundle Architecture
- Vision: Architecture Overview

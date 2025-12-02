# ADR 002: Marker Extraction Pattern

## Status

Accepted

## Context

Components like `<Head>` and `<Markdown>` need to inject content into specific
locations in the final HTML (head section, or processed markdown in place). This
must work with Preact's SSR and hydration.

The challenge: during SSR, we render a component tree to a string. We need to:

1. Collect content from deeply nested components
2. Process it (e.g., run markdown through Shiki)
3. Inject the result into the correct location
4. Ensure hydration doesn't break

## Decision

**Use marker elements that are extracted and replaced post-render.**

Components render custom elements as markers:

```tsx
function Markdown({ children }: { children: string }) {
  const marker = typeof Deno !== "undefined"
    ? `<tabi-markdown>${escape(children)}</tabi-markdown>`
    : "";
  return <div dangerouslySetInnerHTML={{ __html: marker }} />;
}
```

Post-render processing:

1. Find all `<tabi-markdown>` markers in HTML string
2. Extract raw content from each
3. Process markdown with Shiki
4. Replace markers with processed HTML

The `dangerouslySetInnerHTML` wrapper ensures Preact doesn't reconcile children
during hydration - the processed HTML persists.

## Markers

| Marker            | Component              | Processing           |
| ----------------- | ---------------------- | -------------------- |
| `<tabi-markdown>` | `<Markdown>`, `<Code>` | GFM + Shiki          |
| `<tabi-head>`     | `<Head>`               | Inject into `<head>` |

## Consequences

**Positive:**

- Clean separation: render tree, then post-process
- Hydration works (dangerouslySetInnerHTML)
- No client-side processing needed
- Same pattern for Head and Markdown

**Negative:**

- Two-pass rendering (render string, then process markers)
- Markers must be valid HTML (content needs escaping)

## Constraint: Server Rendering Required

`<Code>` and `<Markdown>` must be rendered on the server for syntax
highlighting.

If a component conditionally renders client-only (e.g., behind a `useState`
that's `false` on initial render), no marker is emitted, nothing is processed,
and the code block falls back to unstyled `<pre><code>`.

This is a fundamental constraint, not a bug. Shiki runs server-side only -
shipping it to the client would add ~2MB to the bundle. This matches Astro's
model where syntax highlighting is build-time only.

**Workarounds for conditional content:**

```tsx
// Instead of conditional rendering:
{
  show && <Code>...</Code>;
}

// Use CSS visibility (content is SSR'd, just hidden):
<div style={{ display: show ? "block" : "none" }}>
  <Code>...</Code>
</div>;
```

For docs/blog sites, this constraint rarely matters - content is static and
always server-rendered.

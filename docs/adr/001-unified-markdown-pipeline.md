# ADR 001: Unified Markdown Pipeline

## Status

Accepted

## Context

A naive approach to markdown + component pages has two rendering paths:

- Markdown pages: automatic Shiki highlighting, processed at render time
- TSX pages: no markdown support; requires a complex `<Markdown>` component

This leads to:

- Different entry point generation for each page type
- Complex client-side HTML capture for hydration
- Cache key management in the Markdown component
- Duplicated logic across the codebase

## Decision

**All markdown processing flows through a single pipeline.**

The `<Code>` component (public API) wraps content in markdown code fences and
delegates to the internal `<Markdown>` component:

```
<Code lang="ts">code</Code>
        ↓
<Markdown>{`\`\`\`ts\ncode\n\`\`\``}</Markdown>
        ↓
<tabi-markdown>...</tabi-markdown>  (marker)
        ↓
Post-process: markdown → HTML (Shiki for code blocks)
        ↓
Final HTML
```

Markdown pages (`.md`) wrap their content in `<Markdown>` internally, using the
same path.

## Consequences

**Positive:**

- One marker type (`<tabi-markdown>`)
- One processing pipeline
- Simpler bundle builder (no special markdown handling)
- `<Code>` is just syntactic sugar

**Negative:**

- `<Code>` has slight overhead (wrapping in fences then parsing)
- Per-block Shiki config must go through markdown meta strings

## Alternatives Considered

1. **Separate `<tabi-code>` markers** - More complex, two extraction paths
2. **Client-side highlighting** - Slower, larger bundles, unnecessary

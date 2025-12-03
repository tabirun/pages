# Preact Components Implementation Plan

## Goal

Implement the Preact components that integrate with the unified markdown
pipeline, enabling syntax-highlighted code blocks and head content injection.

## Architecture

````
<Code lang="ts">code</Code>
        ↓
<Markdown>{`\`\`\`ts\ncode\n\`\`\``}</Markdown>
        ↓
<tabi-markdown>```ts
code
```</tabi-markdown>
        ↓
processMarkdownMarkers() (already implemented)
        ↓
<pre class="shiki">...</pre>
````

Components render marker elements during SSR. Post-render processing extracts
and replaces markers with processed content.

## File Structure

```
preact/
├── mod.ts              # Public exports
├── types.ts            # Shared types (exists)
├── markdown.tsx        # Internal <Markdown> component
├── code.tsx            # Public <Code> component
├── head.tsx            # Public <Head> component
├── context.tsx         # FrontmatterProvider + useFrontmatter
├── head-extractor.ts   # processHeadMarkers()
└── tests/
    ├── markdown.test.tsx
    ├── code.test.tsx
    ├── head.test.tsx
    ├── context.test.tsx
    └── head-extractor.test.ts
```

## Implementation

### 1. markdown.tsx

Internal component that renders the `<tabi-markdown>` marker.

```tsx
import { escapeHtml } from "../utils/html.ts";

export interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps): preact.JSX.Element {
  // Server-only: render marker for post-processing
  const isServer = typeof window === "undefined";
  if (!isServer) {
    // Client: return empty div (content already processed during SSR)
    return <div />;
  }

  const marker = `<tabi-markdown>${escapeHtml(children)}</tabi-markdown>`;
  return <div dangerouslySetInnerHTML={{ __html: marker }} />;
}
```

**Tests:**

- Renders tabi-markdown marker on server
- Escapes HTML entities in content
- Returns empty div on client (mock window defined)

### 2. code.tsx

Public component that wraps code in markdown fences.

````tsx
import { Markdown } from "./markdown.tsx";
import type { CodeProps } from "./types.ts";

export function Code({ lang, children }: CodeProps): preact.JSX.Element {
  const fence = lang ? `\`\`\`${lang}` : "```";
  const markdown = `${fence}\n${children}\n\`\`\``;
  return <Markdown>{markdown}</Markdown>;
}
````

**Tests:**

- Wraps content in code fences with language
- Wraps content in code fences without language
- Handles multiline code content
- Handles special characters in code

### 3. head.tsx

Component for injecting content into `<head>`.

```tsx
import { escapeHtml } from "../utils/html.ts";

export interface HeadProps {
  children: preact.ComponentChildren;
}

export function Head({ children }: HeadProps): preact.JSX.Element | null {
  const isServer = typeof window === "undefined";
  if (!isServer) {
    return null;
  }

  // Render children to string, wrap in marker
  const html = renderToString(<>{children}</>);
  const marker = `<tabi-head>${escapeHtml(html)}</tabi-head>`;
  return (
    <div
      dangerouslySetInnerHTML={{ __html: marker }}
      style={{ display: "none" }}
    />
  );
}
```

**Tests:**

- Renders tabi-head marker on server
- Escapes HTML entities
- Renders children (title, meta, link tags)
- Returns null on client

### 4. head-extractor.ts

Extract and process `<tabi-head>` markers.

```tsx
import { unescapeHtml } from "../utils/html.ts";

const HEAD_MARKER_REGEX = /<tabi-head>([\s\S]*?)<\/tabi-head>/g;

export function processHeadMarkers(
  html: string,
): { html: string; head: string } {
  const headParts: string[] = [];
  const matches = [...html.matchAll(HEAD_MARKER_REGEX)];

  let result = html;
  for (const match of matches.reverse()) {
    const content = unescapeHtml(match[1]);
    headParts.unshift(content); // Preserve order
    const start = match.index!;
    const end = start + match[0].length;
    result = result.slice(0, start) + result.slice(end);
  }

  return {
    html: result,
    head: headParts.join("\n"),
  };
}
```

**Tests:**

- Extracts single head marker
- Extracts multiple head markers
- Preserves marker order in output
- Removes marker wrapper divs from body
- Returns empty head for no markers

### 5. context.tsx

Frontmatter context provider and hook.

```tsx
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Frontmatter } from "./types.ts";

const FrontmatterContext = createContext<Frontmatter | null>(null);

export interface FrontmatterProviderProps {
  frontmatter: Frontmatter;
  children: preact.ComponentChildren;
}

export function FrontmatterProvider({
  frontmatter,
  children,
}: FrontmatterProviderProps): preact.JSX.Element {
  return (
    <FrontmatterContext.Provider value={frontmatter}>
      {children}
    </FrontmatterContext.Provider>
  );
}

export function useFrontmatter(): Frontmatter {
  const ctx = useContext(FrontmatterContext);
  if (!ctx) {
    throw new Error("useFrontmatter must be used within FrontmatterProvider");
  }
  return ctx;
}
```

**Tests:**

- useFrontmatter returns frontmatter from provider
- useFrontmatter throws without provider
- Nested components access same frontmatter

### 6. utils/html.ts (COMPLETED)

Shared HTML utilities extracted to top-level `utils/` module. Both `markdown/`
and `preact/` modules import from here.

```tsx
import { escapeHtml, unescapeHtml } from "../utils/html.ts";
```

### 7. mod.ts

Update public exports.

```tsx
// Components
export { Code } from "./code.tsx";
export { Head } from "./head.tsx";
export { FrontmatterProvider } from "./context.tsx";

// Hooks
export { useFrontmatter } from "./context.tsx";

// Processing (internal, but needed by renderer)
export { processHeadMarkers } from "./head-extractor.ts";

// Types
export type { CodeProps, Frontmatter, HeadProps } from "./types.ts";
```

## Public API

```tsx
import {
  Code,
  Head,
  FrontmatterProvider,
  useFrontmatter,
} from "@tabirun/pages/preact";

// Code highlighting
<Code lang="typescript">
  const x = 1;
</Code>

// Head injection
<Head>
  <title>My Page</title>
  <meta name="description" content="..." />
</Head>

// Frontmatter access
function Title() {
  const { title } = useFrontmatter();
  return <h1>{title}</h1>;
}
```

## Delivery Order

1. **utils.ts** - escapeHtml/unescapeHtml (shared utilities)
2. **markdown.tsx** - Internal marker component
3. **code.tsx** - Public Code component
4. **context.tsx** - FrontmatterProvider + useFrontmatter
5. **head.tsx** - Head component
6. **head-extractor.ts** - processHeadMarkers
7. **mod.ts** - Update exports

## Testing Strategy

- Use `preact-render-to-string` for SSR testing
- Mock `window` global for client-side behavior tests
- Test marker output format exactly (for integration with markdown module)
- Test context provider/consumer pattern

## Decisions

| Decision         | Choice                | Rationale                              |
| ---------------- | --------------------- | -------------------------------------- |
| Marker rendering | dangerouslySetHTML    | Prevents Preact reconciliation issues  |
| Server detection | `typeof window`       | Runtime-agnostic, standard SSR pattern |
| Head collection  | Extract + concatenate | Preserves order, simple implementation |
| Context API      | Preact createContext  | Standard pattern, tree-shakeable       |

## Not In Scope

- Client-side head updates (react-helmet style)
- Markdown component as public API (internal only)
- Custom marker element names

## Checklist

- [x] Implement utils.ts with tests (created as `utils/html.ts` shared module)
- [x] Make Shiki theme configurable (added `theme` option to
      `configureHighlighter`)
- [x] Add module READMEs (markdown, pages, preact, utils)
- [x] Implement markdown.tsx with tests (includes hydration preservation via
      `data-tabi-md` + `useId`)
- [x] Implement code.tsx with tests
- [x] Implement context.tsx with tests
- [ ] Implement head.tsx with tests
- [ ] Implement head-extractor.ts with tests
- [x] Update mod.ts exports
- [x] Update types.ts (props colocated with components, only Frontmatter
      remains)
- [x] Run full test suite (137 tests, 100% coverage)
- [x] Code review

## Notes

- Hydration preservation uses `data-tabi-md` attribute with `useId()` to query
  and preserve SSR content during client hydration
- Known limitation: DOM query runs on every re-render and content lost on
  unmount/remount. See `docs/plans/markdown-hydration-cache.md` for planned fix
  (deferred to client bundle work)
- Props types colocated with components per project preference
- Shiki test performance optimized by reusing highlighter instance

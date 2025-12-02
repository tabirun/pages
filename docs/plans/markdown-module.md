# Markdown Module Implementation Plan

## Goal

Process `<tabi-markdown>` markers in HTML, rendering markdown with Shiki syntax
highlighting.

## Architecture

```
HTML with markers → Extract → Process each → Replace → Final HTML
```

Flow:

1. Find all `<tabi-markdown>` markers in HTML string
2. Extract and unescape content from each marker
3. Render markdown with Shiki highlighting
4. Replace markers with processed HTML

## File Structure

```
markdown/
├── mod.ts           # Re-exports
├── shiki.ts         # Lazy singleton highlighter
├── renderer.ts      # marked + Shiki → HTML
├── extractor.ts     # Find/unescape/replace markers
└── tests/
    ├── shiki.test.ts
    ├── renderer.test.ts
    └── extractor.test.ts
```

## Dependencies

Add to `deno.json`:

```json
{
  "imports": {
    "shiki": "npm:shiki@^1.24.0",
    "marked": "npm:marked@^15.0.0"
  }
}
```

## Implementation

### 1. shiki.ts

Lazy singleton for Shiki highlighter.

```ts
import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: [
        "typescript",
        "javascript",
        "tsx",
        "jsx",
        "bash",
        "json",
        "css",
        "html",
        "markdown",
      ],
    });
  }
  return highlighter;
}
```

**Tests:**

- Returns same instance on multiple calls
- Can highlight TypeScript
- Handles unknown languages gracefully

### 2. renderer.ts

Markdown to HTML with Shiki code blocks.

```ts
import { Marked } from "marked";
import { getHighlighter } from "./shiki.ts";

export async function renderMarkdown(markdown: string): Promise<string> {
  const hl = await getHighlighter();
  const marked = new Marked();

  marked.use({
    renderer: {
      code({ text, lang }) {
        try {
          return hl.codeToHtml(text, {
            lang: lang || "text",
            theme: "github-dark",
          });
        } catch {
          return `<pre><code>${escapeHtml(text)}</code></pre>`;
        }
      },
    },
  });

  return await marked.parse(markdown);
}
```

**Tests:**

- Renders headings, paragraphs, lists
- Renders GFM tables, strikethrough
- Highlights code blocks with correct language
- Falls back gracefully for unknown languages
- Handles code blocks without language specified

### 3. extractor.ts

Find and process `<tabi-markdown>` markers.

```ts
import { renderMarkdown } from "./renderer.ts";

const MARKER_REGEX = /<tabi-markdown>([\s\S]*?)<\/tabi-markdown>/g;

export async function processMarkdownMarkers(html: string): Promise<string> {
  const matches = [...html.matchAll(MARKER_REGEX)];

  let result = html;
  for (const match of matches) {
    const raw = unescapeHtml(match[1]);
    const rendered = await renderMarkdown(raw);
    result = result.replace(match[0], rendered);
  }

  return result;
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
```

**Tests:**

- Extracts single marker
- Extracts multiple markers
- Unescapes HTML entities correctly
- Preserves non-marker content
- Handles empty markers

### 4. mod.ts

```ts
export { processMarkdownMarkers } from "./extractor.ts";
export { renderMarkdown } from "./renderer.ts";
```

## Public API

```ts
import {
  processMarkdownMarkers,
  renderMarkdown,
} from "@tabirun/pages/markdown";

// Process HTML with embedded markers
const html = await processMarkdownMarkers(
  "<tabi-markdown># Hello</tabi-markdown>",
);

// Render markdown directly
const html = await renderMarkdown("# Hello");
```

## Test Examples

### shiki.test.ts

```ts
describe("shiki", () => {
  it("should return singleton instance", async () => {
    const a = await getHighlighter();
    const b = await getHighlighter();
    expect(a).toBe(b);
  });
});
```

### renderer.test.ts

````ts
describe("renderMarkdown", () => {
  it("should render heading", async () => {
    const html = await renderMarkdown("# Hello");
    expect(html).toContain("<h1>Hello</h1>");
  });

  it("should highlight typescript code", async () => {
    const html = await renderMarkdown("```ts\nconst x = 1;\n```");
    expect(html).toContain("shiki");
    expect(html).toContain("const");
  });
});
````

### extractor.test.ts

```ts
describe("processMarkdownMarkers", () => {
  it("should process single marker", async () => {
    const input = "<div><tabi-markdown># Hello</tabi-markdown></div>";
    const output = await processMarkdownMarkers(input);
    expect(output).toContain("<h1>Hello</h1>");
    expect(output).not.toContain("tabi-markdown");
  });

  it("should unescape html entities", async () => {
    const input = "<tabi-markdown>&lt;div&gt;</tabi-markdown>";
    const output = await processMarkdownMarkers(input);
    expect(output).toContain("<div>");
  });
});
```

## Decisions

| Decision    | Choice      | Rationale                           |
| ----------- | ----------- | ----------------------------------- |
| Parser      | marked      | Flexible renderer API, GFM support  |
| Highlighter | shiki       | VS Code grammars, better than Prism |
| Theme       | github-dark | Sensible default                    |
| Languages   | Lazy-load   | Shiki handles this automatically    |

## Not In Scope

- Theme configuration (hardcode for v1)
- Line highlighting / diff
- Caching
- Custom language registration

## Checklist

- [ ] Add dependencies to deno.json
- [ ] Implement shiki.ts with tests
- [ ] Implement renderer.ts with tests
- [ ] Implement extractor.ts with tests
- [ ] Create mod.ts exports
- [ ] Update deno.json exports for `./markdown`
- [ ] Run full test suite
- [ ] Code review

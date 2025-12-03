# markdown

Markdown rendering with Shiki syntax highlighting.

## Installation

```typescript
import {
  processMarkdownMarkers,
  renderMarkdown,
} from "@tabirun/pages/markdown";
```

## Usage

````typescript
// Render markdown to HTML
const html = await renderMarkdown("# Hello\n\n```ts\nconst x = 1;\n```");

// Process <tabi-markdown> markers in HTML (used internally by preact components)
const processed = await processMarkdownMarkers(
  "<div><tabi-markdown># Title</tabi-markdown></div>",
);
````

## API

| Function                 | Description                                  |
| ------------------------ | -------------------------------------------- |
| `renderMarkdown(md)`     | Render markdown string to HTML with Shiki    |
| `processMarkdownMarkers` | Extract and render `<tabi-markdown>` markers |
| `configureHighlighter`   | Add languages before first render            |

## Configuration

```typescript
import {
  configureHighlighter,
  DEFAULT_LANGUAGES,
} from "@tabirun/pages/markdown";

// Add custom languages (must be called before first render)
configureHighlighter({
  additionalLangs: ["elixir", "haskell"],
});
```

## Default Languages

Web, shell, systems, JVM, .NET, and scripting languages are included by default.
See `DEFAULT_LANGUAGES` for the full list.

## Notes

- Theme is hard-coded to `github-dark`
- Output is not sanitized; only use with trusted input
- Highlighter is lazily initialized as a singleton

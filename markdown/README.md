# markdown

Internal module for markdown rendering with Shiki syntax highlighting.

## API

| Function                 | Description                                  |
| ------------------------ | -------------------------------------------- |
| `renderMarkdown(md)`     | Render markdown string to HTML with Shiki    |
| `processMarkdownMarkers` | Extract and render `<tabi-markdown>` markers |
| `configureHighlighter`   | Set theme and languages before first render  |
| `getConfiguredTheme`     | Get the current theme                        |

## Configuration

| Option            | Type       | Default         | Description                  |
| ----------------- | ---------- | --------------- | ---------------------------- |
| `theme`           | `string`   | `"github-dark"` | Shiki theme for highlighting |
| `additionalLangs` | `string[]` | `[]`            | Extra languages to load      |

## Default Languages

Web, shell, systems, JVM, .NET, and scripting languages are included by default.
See `DEFAULT_LANGUAGES` for the full list.

## Notes

- Internal module; not part of public API
- Configuration must be set before first render
- Output is not sanitized; only use with trusted input
- Highlighter is lazily initialized as a singleton

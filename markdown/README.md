# markdown

Internal module for markdown rendering with Shiki syntax highlighting.

## API

| Function                 | Description                                  |
| ------------------------ | -------------------------------------------- |
| `renderMarkdown(md)`     | Render markdown string to HTML with Shiki    |
| `processMarkdownMarkers` | Extract and render `<tabi-markdown>` markers |
| `configureHighlighter`   | Add languages before first render            |

## Default Languages

Web, shell, systems, JVM, .NET, and scripting languages are included by default.
See `DEFAULT_LANGUAGES` for the full list.

## Notes

- Internal module; not part of public API
- Theme is hard-coded to `github-dark`
- Output is not sanitized; only use with trusted input
- Highlighter is lazily initialized as a singleton

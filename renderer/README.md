# renderer

Server-side rendering for pages with layout composition and hydration support.

## API

| Export            | Description                             |
| ----------------- | --------------------------------------- |
| `renderPage`      | Render a page to complete HTML document |
| `DefaultDocument` | Default HTML document shell component   |
| `RenderError`     | Error thrown when rendering fails       |

## Usage

```ts
import {
  DefaultDocument,
  RenderError,
  renderPage,
} from "@tabirun/pages/renderer";

// Render a page to HTML
const result = await renderPage({
  page: loadedPage,
  layouts: [rootLayout, blogLayout],
  clientBundlePath: "/_tabi/blog/post.js",
  route: "/blog/post",
});

console.log(result.html); // Complete HTML with DOCTYPE
```

## Render Pipeline

`renderPage` orchestrates the full SSR pipeline:

1. **Compose** - Nests page in layout chain with FrontmatterProvider
2. **Render** - Converts component tree to HTML string
3. **Markdown** - Processes `<tabi-markdown>` markers to rendered HTML
4. **Head** - Extracts `<tabi-head>` markers to document head
5. **Serialize** - Creates hydration data script
6. **Document** - Wraps in document shell with DOCTYPE

## Custom Documents

The default document provides basic HTML structure. Custom documents can add
global styles, scripts, fonts, or modify the HTML shell.

```tsx
import type { DocumentProps } from "@tabirun/pages/renderer";

function CustomDocument({ head, children }: DocumentProps) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="/fonts.css" />
        {head}
      </head>
      <body className="antialiased bg-gray-900">
        {children}
      </body>
    </html>
  );
}

// Use custom document
const result = await renderPage({
  page,
  layouts,
  clientBundlePath,
  route,
  document: CustomDocument,
});
```

The renderer handles:

- Wrapping content in hydration root (`<div id="__tabi__">`)
- Injecting data script (`<script id="__TABI_DATA__">`)
- Injecting bundle script (`<script type="module">`)

Custom documents only need to place `head` and `children`.

## Types

### RenderPageOptions

```ts
interface RenderPageOptions {
  page: LoadedPage;
  layouts: LoadedLayout[];
  clientBundlePath: string;
  route: string;
  document?: ComponentType<DocumentProps>;
}
```

### RenderPageResult

```ts
interface RenderPageResult {
  html: string; // Complete HTML with DOCTYPE
}
```

### DocumentProps

```ts
interface DocumentProps {
  head: ComponentChildren; // Content for <head>
  children: ComponentChildren; // Content for <body>
}
```

## Error Handling

```ts
import { RenderError } from "@tabirun/pages/renderer";

try {
  const result = await renderPage(options);
} catch (error) {
  if (error instanceof RenderError) {
    console.log(error.route); // Failed route
    console.log(error.message); // Error description
    console.log(error.cause); // Original error
  }
}
```

## Notes

- Internal module used by dev/build
- Markdown pages render via `<tabi-markdown>` marker pattern
- Head content extracted from `<Head>` components via marker pattern
- Data script is HTML-escaped to prevent XSS
- All pages hydrate (universal hydration per ADR-003)

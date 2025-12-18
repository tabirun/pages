# scanner

File discovery module for pages, layouts, system files, and public assets.

## API

| Function     | Description                                              |
| ------------ | -------------------------------------------------------- |
| `scanPages`  | Scan directories and return manifest of discovered files |
| `watchPages` | Watch for file changes and emit events                   |

## Usage

```ts
import { scanPages, watchPages } from "@tabirun/pages/scanner";

// Scan for all files
const manifest = await scanPages({
  rootDir: "/path/to/project",
  pagesDir: "pages", // default
  publicDir: "public", // default
});

// Watch for changes
const handle = watchPages({
  rootDir: "/path/to/project",
  onChange: (event) => {
    console.log(event.type, event.category, event.filePath);
  },
});

// Stop watching
handle.stop();
```

## Manifest Structure

```ts
interface PageManifest {
  pages: PageEntry[]; // Discovered .md and .tsx pages
  layouts: LayoutEntry[]; // Discovered _layout.tsx files
  systemFiles: SystemFiles; // _document.tsx, _404.tsx, _error.tsx
  publicAssets: PublicAsset[]; // Files from public directory
}
```

## File Classification

| Pattern         | Classification | Description             |
| --------------- | -------------- | ----------------------- |
| `*.md`          | page           | Markdown page           |
| `*.tsx` (not _) | page           | TSX page                |
| `_layout.tsx`   | layout         | Layout component        |
| `_document.tsx` | system (html)  | Custom document wrapper |
| `_404.tsx`      | system         | Not found page          |
| `_error.tsx`    | system         | Error page              |
| `uno.config.ts` | system         | UnoCSS config (at root) |

## Layout Chains

Pages automatically resolve their layout chain from innermost to outermost:

```
pages/
├── _layout.tsx           # Root layout
├── blog/
│   ├── _layout.tsx       # Blog layout
│   └── post.md           # layoutChain: [root, blog]
└── about.tsx             # layoutChain: [root]
```

## Watch Events

```ts
interface FileChangeEvent {
  type: "create" | "update" | "delete";
  category:
    | "page"
    | "layout"
    | "system"
    | "postcssConfig"
    | "publicAsset"
    | "code";
  filePath: string;
  route?: string; // For pages only
}
```

## Notes

- Internal module used by dev/build
- Scanner is synchronous; watcher uses `Deno.watchFs`
- Layout chains are computed at scan time
- Watcher debounces rapid file changes

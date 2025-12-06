# loaders

Page and layout loading with frontmatter validation.

## API

| Function           | Description                                   |
| ------------------ | --------------------------------------------- |
| `loadPage`         | Load a page file (.md or .tsx)                |
| `loadMarkdownPage` | Load a markdown page with frontmatter         |
| `loadTsxPage`      | Load a TSX page with exported frontmatter     |
| `loadLayout`       | Load a layout component                       |
| `parseFrontmatter` | Parse and validate YAML frontmatter from text |

## Usage

```ts
import {
  loadLayout,
  loadPage,
  PageFrontmatterSchema,
  parseFrontmatter,
} from "@tabirun/pages/loaders";

// Load any page (auto-detects type)
const page = await loadPage("/path/to/page.md");
if (page.type === "markdown") {
  console.log(page.content);
} else {
  console.log(page.component);
}

// Load a layout
const layout = await loadLayout("/path/to/_layout.tsx", "/path/to");

// Parse frontmatter directly
const { frontmatter, content } = parseFrontmatter(
  "---\ntitle: Hello\n---\nContent here",
  "file.md",
);
```

## Loaded Types

### LoadedMarkdownPage

```ts
interface LoadedMarkdownPage {
  type: "markdown";
  frontmatter: PageFrontmatter;
  content: string; // Raw markdown without frontmatter
  filePath: string;
}
```

### LoadedTsxPage

```ts
interface LoadedTsxPage {
  type: "tsx";
  frontmatter: PageFrontmatter;
  component: ComponentType;
  filePath: string;
}
```

### LoadedLayout

```ts
interface LoadedLayout {
  component: ComponentType<LayoutProps>;
  filePath: string;
  directory: string;
}
```

## Frontmatter

### Schema

Default schema validates common fields:

```ts
const PageFrontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  draft: z.boolean().optional(),
}).passthrough(); // Allows custom fields
```

### Markdown Pages

Frontmatter is extracted from YAML block at file start:

```md
---
title: My Page
description: A description
draft: true
customField: value
---

# Content starts here
```

### TSX Pages

Frontmatter is exported as a named constant:

```tsx
export const frontmatter = {
  title: "My Page",
  description: "A description",
};

export default function Page() {
  return <h1>Hello</h1>;
}
```

## Error Handling

| Error              | Thrown When                                        |
| ------------------ | -------------------------------------------------- |
| `LoaderError`      | File read fails, import fails, invalid type        |
| `FrontmatterError` | Frontmatter validation fails (extends LoaderError) |

```ts
import { FrontmatterError, LoaderError } from "@tabirun/pages/loaders";

try {
  const page = await loadPage("/path/to/page.md");
} catch (error) {
  if (error instanceof FrontmatterError) {
    console.log(error.validationErrors); // ZodError
  } else if (error instanceof LoaderError) {
    console.log(error.filePath);
  }
}
```

## Notes

- Internal module used by dev/build
- TSX files are dynamically imported via `file://` URLs
- Layouts receive children via props, access frontmatter via `useFrontmatter()`
  hook
- Empty or missing frontmatter is valid (defaults to `{}`)

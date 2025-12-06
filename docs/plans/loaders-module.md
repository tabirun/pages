# Loaders Module Implementation Plan

## Overview

The loaders module bridges file discovery (scanner) with rendering
(preact/markdown). It loads page and layout files, extracts frontmatter,
validates metadata, and returns normalized objects ready for composition and
rendering.

## Module Structure

```
loaders/
├── mod.ts              # Public exports
├── types.ts            # Type definitions
├── frontmatter.ts      # Frontmatter parsing and validation
├── markdown-loader.ts  # Load .md files
├── tsx-loader.ts       # Load .tsx files
├── layout-loader.ts    # Load _layout.tsx files
└── tests/
    ├── frontmatter.test.ts
    ├── markdown-loader.test.ts
    ├── tsx-loader.test.ts
    └── layout-loader.test.ts
```

## Type Definitions

```ts
// types.ts
import type { ComponentType } from "preact";
import type { Frontmatter } from "../preact/types.ts";

/**
 * Base frontmatter schema - extended by pages.
 */
export interface BaseFrontmatter {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Page frontmatter with optional common fields.
 */
export interface PageFrontmatter extends BaseFrontmatter {
  /** Page title for <title> and <h1>. */
  title?: string;
  /** Meta description. */
  description?: string;
  /** Publication date (for blogs). */
  date?: string;
  /** Draft status - excluded from production builds. */
  draft?: boolean;
  /** Custom layout override. */
  layout?: string;
}

/**
 * Loaded markdown page.
 */
export interface LoadedMarkdownPage {
  type: "markdown";
  /** Validated frontmatter. */
  frontmatter: PageFrontmatter;
  /** Raw markdown content (without frontmatter). */
  content: string;
  /** Source file path. */
  filePath: string;
}

/**
 * Loaded TSX page.
 */
export interface LoadedTsxPage {
  type: "tsx";
  /** Validated frontmatter from exported `frontmatter` const. */
  frontmatter: PageFrontmatter;
  /** Default exported component. */
  component: ComponentType;
  /** Source file path. */
  filePath: string;
}

/**
 * Union of loaded page types.
 */
export type LoadedPage = LoadedMarkdownPage | LoadedTsxPage;

/**
 * Layout component props.
 * Layouts access frontmatter via useFrontmatter() hook, not props.
 */
export interface LayoutProps {
  /** Page content (children). */
  children: ComponentChildren;
}

/**
 * Loaded layout.
 */
export interface LoadedLayout {
  /** Default exported layout component. */
  component: ComponentType<LayoutProps>;
  /** Source file path. */
  filePath: string;
  /** Directory this layout applies to. */
  directory: string;
}

/**
 * Options for loading pages.
 */
export interface LoadOptions {
  /** Custom frontmatter schema for validation. */
  frontmatterSchema?: ZodSchema;
}

/**
 * Errors thrown by loaders.
 */
export class LoaderError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "LoaderError";
  }
}

export class FrontmatterError extends LoaderError {
  constructor(
    message: string,
    filePath: string,
    public readonly validationErrors: ZodError,
  ) {
    super(message, filePath);
    this.name = "FrontmatterError";
  }
}
```

## Implementation Details

### 1. Frontmatter Parser (`frontmatter.ts`)

Extracts YAML frontmatter from markdown files and validates against schema.

```ts
// frontmatter.ts
import { z } from "zod";

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export const PageFrontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  draft: z.boolean().optional(),
  layout: z.string().optional(),
}).passthrough(); // Allow additional fields

export interface ParsedFrontmatter<T> {
  frontmatter: T;
  content: string;
}

/**
 * Parse frontmatter from markdown content.
 * Returns empty object if no frontmatter found.
 */
export function parseFrontmatter<T = PageFrontmatter>(
  raw: string,
  schema: ZodSchema<T> = PageFrontmatterSchema,
): ParsedFrontmatter<T>;
```

**Implementation notes:**

- Use simple YAML parsing (consider `@std/yaml` or inline parser for minimal
  deps)
- Return empty frontmatter object if no `---` block found
- Throw `FrontmatterError` on validation failure with detailed path info

### 2. Markdown Loader (`markdown-loader.ts`)

Loads `.md` files and extracts frontmatter + content.

```ts
// markdown-loader.ts

/**
 * Load a markdown page file.
 *
 * @param filePath - Absolute path to .md file
 * @param options - Load options
 * @returns Loaded markdown page
 * @throws {LoaderError} If file cannot be read
 * @throws {FrontmatterError} If frontmatter validation fails
 */
export async function loadMarkdownPage(
  filePath: string,
  options?: LoadOptions,
): Promise<LoadedMarkdownPage>;
```

**Implementation notes:**

- Read file with `Deno.readTextFile`
- Parse frontmatter with `parseFrontmatter`
- Return normalized `LoadedMarkdownPage`

### 3. TSX Loader (`tsx-loader.ts`)

Loads `.tsx` page files via dynamic import.

```ts
// tsx-loader.ts

/**
 * Load a TSX page file.
 *
 * @param filePath - Absolute path to .tsx file
 * @param options - Load options
 * @returns Loaded TSX page
 * @throws {LoaderError} If file cannot be imported or has no default export
 * @throws {FrontmatterError} If frontmatter validation fails
 */
export async function loadTsxPage(
  filePath: string,
  options?: LoadOptions,
): Promise<LoadedTsxPage>;
```

**TSX page contract:**

```tsx
// pages/about.tsx
import type { JSX } from "preact";

export const frontmatter = {
  title: "About Us",
  description: "Learn about our team",
};

export default function AboutPage(): JSX.Element {
  return (
    <main>
      <h1>About Us</h1>
    </main>
  );
}
```

**Implementation notes:**

- Use `import()` for dynamic loading
- Extract `default` export as component (throw if missing)
- Extract optional `frontmatter` named export
- Validate frontmatter against schema
- Convert file path to `file://` URL for import

### 4. Layout Loader (`layout-loader.ts`)

Loads `_layout.tsx` files.

```ts
// layout-loader.ts

/**
 * Load a layout file.
 *
 * @param filePath - Absolute path to _layout.tsx file
 * @param directory - Directory this layout applies to
 * @returns Loaded layout
 * @throws {LoaderError} If file cannot be imported or has no default export
 */
export async function loadLayout(
  filePath: string,
  directory: string,
): Promise<LoadedLayout>;
```

**Layout contract:**

```tsx
// pages/_layout.tsx
import type { ComponentChildren, JSX } from "preact";
import { useFrontmatter } from "@tabirun/pages/preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function RootLayout({ children }: LayoutProps): JSX.Element {
  // useFrontmatter works automatically - framework injects provider
  const { title } = useFrontmatter();
  return (
    <html>
      <head>
        <title>{title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Note:** Layouts receive only `children`. Frontmatter is accessed via
`useFrontmatter()` hook. The framework wraps the entire component tree with
`FrontmatterProvider` before rendering.

**Implementation notes:**

- Similar to TSX loader but no frontmatter extraction
- Validate component accepts `LayoutProps`

### 5. Unified Loader (`loader.ts`)

Convenience function that loads based on file extension.

```ts
// loader.ts

/**
 * Load a page file (markdown or TSX).
 *
 * @param filePath - Absolute path to page file
 * @param options - Load options
 * @returns Loaded page
 * @throws {LoaderError} If file type is unsupported
 */
export async function loadPage(
  filePath: string,
  options?: LoadOptions,
): Promise<LoadedPage>;
```

## Public API (`mod.ts`)

```ts
// mod.ts
export { loadMarkdownPage } from "./markdown-loader.ts";
export { loadTsxPage } from "./tsx-loader.ts";
export { loadLayout } from "./layout-loader.ts";
export { loadPage } from "./loader.ts";
export { PageFrontmatterSchema, parseFrontmatter } from "./frontmatter.ts";
export { FrontmatterError, LoaderError } from "./types.ts";

export type {
  BaseFrontmatter,
  LayoutProps,
  LoadedLayout,
  LoadedMarkdownPage,
  LoadedPage,
  LoadedTsxPage,
  LoadOptions,
  PageFrontmatter,
} from "./types.ts";
```

## Framework Composition

The framework (dev/build modules) is responsible for composing loaded pages with
layouts and injecting the `FrontmatterProvider`. The composition flow:

```tsx
// Pseudocode - implemented in dev/build modules, not loaders
function composePage(page: LoadedPage, layouts: LoadedLayout[]): VNode {
  const frontmatter = page.frontmatter;
  const content = page.type === "markdown"
    ? <Markdown>{page.content}</Markdown>
    : <page.component />;

  // Nest layouts from innermost to outermost
  let composed = content;
  for (const layout of layouts.reverse()) {
    composed = <layout.component>{composed}</layout.component>;
  }

  // Framework injects FrontmatterProvider at the root
  return (
    <FrontmatterProvider frontmatter={frontmatter}>
      {composed}
    </FrontmatterProvider>
  );
}
```

This means:

- **Loaders** just load and validate - no rendering concerns
- **Layouts** use `useFrontmatter()` hook - no prop drilling
- **Pages** (TSX) can also use `useFrontmatter()` if needed
- **FrontmatterProvider** is internal - users never import it

## Module Caching (Dev Mode)

Deno caches dynamic imports, which would cause stale code in dev mode. However,
**loaders don't need to solve this** - the bundler handles it.

See ADR-004 (SSR Bundling Strategy): The bundler generates fresh esbuild bundles
for SSR, bypassing Deno's module cache entirely. Loaders are only used during
production builds where caching isn't an issue (one-shot process).

In dev mode, the flow is:

1. Watcher detects file change
2. Bundler generates fresh SSR bundle (includes page + layouts + dependencies)
3. Framework imports the fresh bundle
4. Loaders are not involved - bundler handles loading

## Error Handling

All loaders provide clear error messages with file paths:

```
LoaderError: Failed to load page
  File: /Users/dev/project/pages/blog/post.md
  Cause: ENOENT: No such file or directory

FrontmatterError: Invalid frontmatter
  File: /Users/dev/project/pages/about.md
  Validation errors:
    - date: Expected string, received number
```

## Testing Strategy

### Unit Tests

1. **frontmatter.test.ts**
   - Parse valid frontmatter
   - Handle missing frontmatter (empty object)
   - Handle malformed YAML
   - Validate against custom schema
   - Passthrough unknown fields

2. **markdown-loader.test.ts**
   - Load valid markdown with frontmatter
   - Load markdown without frontmatter
   - Handle file not found
   - Handle invalid frontmatter

3. **tsx-loader.test.ts**
   - Load valid TSX page with frontmatter export
   - Load TSX page without frontmatter
   - Handle missing default export
   - Handle import errors

4. **layout-loader.test.ts**
   - Load valid layout
   - Handle missing default export
   - Nested layouts

### Test Fixtures

```
loaders/tests/fixtures/
├── pages/
│   ├── valid.md
│   ├── no-frontmatter.md
│   ├── invalid-frontmatter.md
│   ├── about.tsx
│   ├── no-default.tsx
│   └── _layout.tsx
└── layouts/
    └── nested/
        └── _layout.tsx
```

## Implementation Order

1. **types.ts** - Define all types and error classes
2. **frontmatter.ts** - Frontmatter parsing (no external deps)
3. **frontmatter.test.ts** - Test frontmatter parsing
4. **markdown-loader.ts** - Markdown loading
5. **markdown-loader.test.ts** - Test markdown loading
6. **tsx-loader.ts** - TSX loading
7. **tsx-loader.test.ts** - Test TSX loading
8. **layout-loader.ts** - Layout loading
9. **layout-loader.test.ts** - Test layout loading
10. **loader.ts** - Unified loader
11. **mod.ts** - Public exports

## Dependencies

- `zod` - Already in project for validation
- `@std/yaml` - For YAML parsing (or inline implementation)

## Open Questions

1. **YAML parser**: Use `@std/yaml` or implement minimal parser for just
   frontmatter?
   - Recommendation: `@std/yaml` - well tested, handles edge cases

2. **Custom frontmatter schemas**: Allow users to pass custom Zod schemas?
   - Recommendation: Yes, with `PageFrontmatterSchema` as default

3. **Module caching**: Should we cache loaded modules in dev mode?
   - Recommendation: No caching in loaders; let dev server handle invalidation

## Future Considerations

- **Incremental loading**: Only reload changed files (integrate with watcher)
- **Parallel loading**: Load multiple pages concurrently
- **MDX support**: Could extend markdown loader for MDX in future

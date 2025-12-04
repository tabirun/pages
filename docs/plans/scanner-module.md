# Scanner Module Implementation Plan

## Status

Approved

## Overview

The scanner module discovers page files, layouts, system files, and public
assets. It provides both one-shot scanning for builds and watch mode for
development with file change events.

## Goals

1. Discover page files (`*.md`, `*.tsx`) recursively
2. Discover layout files (`_layout.tsx`) for hierarchical composition
3. Discover system files (`_html.tsx`, `_not-found.tsx`, `_error.tsx`)
4. Discover UnoCSS config (`uno.config.ts`) at project root
5. Discover public assets (`public/**/*`)
6. Map file paths to URL routes
7. Build layout chains for each page
8. Watch mode with event subscription for dev server
9. Return typed manifests for downstream consumption

## Non-Goals

- Parsing file contents (that's the loader's job)
- Validating frontmatter (that's the loader's job)
- WebSocket communication (that's the dev server's job)

## API Design

```typescript
// scanner/mod.ts
export { scanPages, watchPages } from "./scanner.ts";
export type {
  FileChangeEvent,
  FileChangeType,
  LayoutEntry,
  PageEntry,
  PageManifest,
  PublicAsset,
  SystemFiles,
  WatchHandle,
} from "./types.ts";
```

### Core Types

```typescript
// scanner/types.ts

/**
 * A discovered page file.
 */
export interface PageEntry {
  /** Absolute path to the page file. */
  filePath: string;
  /** URL route (e.g., "/blog/hello-world"). */
  route: string;
  /** Page type based on extension. */
  type: "markdown" | "tsx";
  /** Layout file paths in order from root to leaf. */
  layoutChain: string[];
}

/**
 * A discovered layout file.
 */
export interface LayoutEntry {
  /** Absolute path to the layout file. */
  filePath: string;
  /** Directory this layout applies to. */
  directory: string;
}

/**
 * System files with optional defaults.
 */
export interface SystemFiles {
  /** Custom document wrapper. Null if using default. */
  html: string | null;
  /** Custom 404 page. Null if using default. */
  notFound: string | null;
  /** Custom error page. Null if using default. */
  error: string | null;
  /** UnoCSS config. Null if UnoCSS not enabled. */
  unoConfig: string | null;
}

/**
 * A public asset file.
 */
export interface PublicAsset {
  /** Absolute path to the asset file. */
  filePath: string;
  /** URL path (e.g., "/favicon.ico"). */
  urlPath: string;
}

/**
 * Result of scanning a pages directory.
 */
export interface PageManifest {
  /** All discovered pages. */
  pages: PageEntry[];
  /** All discovered layouts. */
  layouts: LayoutEntry[];
  /** System files (with nulls for defaults). */
  systemFiles: SystemFiles;
  /** Public assets. */
  publicAssets: PublicAsset[];
}

/**
 * Type of file change event.
 */
export type FileChangeType = "create" | "update" | "delete";

/**
 * Category of changed file for targeted refresh.
 */
export type FileCategory =
  | "page"
  | "layout"
  | "system"
  | "unoConfig"
  | "publicAsset"
  | "code"; // Any .ts/.tsx that might be imported

/**
 * File change event for watch mode.
 */
export interface FileChangeEvent {
  /** Type of change. */
  type: FileChangeType;
  /** Category of the changed file. */
  category: FileCategory;
  /** Absolute path to the changed file. */
  filePath: string;
  /** URL route if applicable (for pages). */
  route?: string;
}

/**
 * Handle returned by watchPages for cleanup.
 */
export interface WatchHandle {
  /** Stop watching and clean up resources. */
  stop(): void;
}
```

### Scanner Functions

```typescript
// scanner/scanner.ts

export interface ScanOptions {
  /** Project root directory. */
  rootDir: string;
  /** Directory containing page files (relative to rootDir). Defaults to "pages". */
  pagesDir?: string;
  /** Directory containing public assets (relative to rootDir). Defaults to "public". */
  publicDir?: string;
}

/**
 * Scans directories for pages, layouts, system files, and assets.
 *
 * @param options - Scan configuration
 * @returns Manifest of discovered files
 * @throws {Error} If rootDir does not exist
 */
export async function scanPages(options: ScanOptions): Promise<PageManifest>;

/**
 * Watches for file changes and emits events.
 *
 * @param options - Scan configuration
 * @param onChange - Callback for file change events
 * @returns Handle to stop watching
 */
export function watchPages(
  options: ScanOptions,
  onChange: (event: FileChangeEvent) => void,
): WatchHandle;
```

## File Conventions

### Pages Directory (`./pages/`)

| Pattern                  | Type    | Description                                    |
| ------------------------ | ------- | ---------------------------------------------- |
| `*.md`                   | Page    | Markdown page                                  |
| `*.tsx`                  | Page    | TSX page (excluding system/layout files)       |
| `_layout.tsx`            | Layout  | Layout component for directory and descendants |
| `_html.tsx`              | System  | Document wrapper (server only)                 |
| `_not-found.tsx`         | System  | 404 fallback page                              |
| `_error.tsx`             | System  | Error fallback page                            |
| `_*.tsx`                 | Ignored | Other private files (underscore prefix)        |
| `index.md` / `index.tsx` | Page    | Directory index                                |

### Project Root

| Pattern         | Type   | Description          |
| --------------- | ------ | -------------------- |
| `uno.config.ts` | System | UnoCSS configuration |

### Public Directory (`./public/`)

| Pattern | Type  | Description                     |
| ------- | ----- | ------------------------------- |
| `**/*`  | Asset | Static files served at root URL |

## Route Mapping Rules

| File Path                   | Route               |
| --------------------------- | ------------------- |
| `pages/index.md`            | `/`                 |
| `pages/about.tsx`           | `/about`            |
| `pages/blog/index.md`       | `/blog`             |
| `pages/blog/hello-world.md` | `/blog/hello-world` |
| `public/favicon.ico`        | `/favicon.ico`      |
| `public/images/logo.png`    | `/images/logo.png`  |

## Layout Chain Resolution

Layouts are discovered bottom-up and applied top-down:

```
pages/
├── _layout.tsx          # Root layout (applied first)
├── index.md
└── blog/
    ├── _layout.tsx      # Blog layout (applied second)
    └── post.md
```

For `pages/blog/post.md`, the layout chain is:

```typescript
layoutChain: [
  "/abs/path/pages/_layout.tsx",
  "/abs/path/pages/blog/_layout.tsx",
];
```

## Watch Mode Behavior

### Watched Paths

| Path                          | Category      | Triggers      |
| ----------------------------- | ------------- | ------------- |
| `pages/**/*.md`               | `page`        | Page refresh  |
| `pages/**/*.tsx` (pages)      | `page`        | Page refresh  |
| `pages/**/_layout.tsx`        | `layout`      | Full refresh  |
| `pages/_html.tsx`             | `system`      | Full refresh  |
| `pages/_not-found.tsx`        | `system`      | Full refresh  |
| `pages/_error.tsx`            | `system`      | Full refresh  |
| `uno.config.ts`               | `unoConfig`   | Full refresh  |
| `public/**/*`                 | `publicAsset` | Asset refresh |
| `**/*.ts`, `**/*.tsx` (other) | `code`        | Full refresh  |

### Event Flow

```
File change detected
        ↓
Classify file category
        ↓
Emit FileChangeEvent
        ↓
Dev server receives event
        ↓
Send WebSocket message to browser
        ↓
Browser refreshes (full or targeted)
```

### Debouncing

Watch mode debounces rapid changes (e.g., editor save + format) with a
configurable delay (default: 100ms).

## Implementation Steps

### Step 1: Types and Module Structure

Create the module structure and type definitions.

Files:

- `scanner/types.ts` - Type definitions
- `scanner/mod.ts` - Public exports

### Step 2: Directory Walking

Implement recursive directory traversal using `@std/fs`.

Files:

- `scanner/walker.ts` - Directory walking utility

Behavior:

- Walk directory recursively
- Yield file entries with relative paths
- Skip node_modules and hidden directories

### Step 3: File Classification

Implement logic to classify files as pages, layouts, system files, or ignored.

Files:

- `scanner/classifier.ts` - File classification logic

Behavior:

- Identify file type by extension and name
- Recognize system files (`_html.tsx`, `_not-found.tsx`, `_error.tsx`)
- Skip other underscore-prefixed files
- Return classification result

### Step 4: Route Generation

Implement file path to URL route conversion.

Files:

- `scanner/routes.ts` - Route generation logic

Behavior:

- Strip directory prefix
- Remove file extension
- Convert `index` to directory path
- Normalize path separators
- Handle public assets

### Step 5: Layout Chain Building

Implement layout chain resolution for each page.

Files:

- `scanner/layouts.ts` - Layout chain resolution

Behavior:

- Collect layouts from root to page directory
- Build ordered chain for each page
- Handle missing layouts gracefully

### Step 6: Scanner Integration

Combine all pieces into the main scanner function.

Files:

- `scanner/scanner.ts` - Main scanner implementation

Behavior:

- Walk pages directory
- Walk public directory
- Check for system files
- Classify files
- Generate routes
- Build layout chains
- Return manifest

### Step 7: Watch Mode

Implement file watcher with event emission.

Files:

- `scanner/watcher.ts` - File watching with Deno.watchFs

Behavior:

- Watch pages, public, and root directories
- Debounce rapid changes
- Classify changed files
- Emit typed events
- Return cleanup handle

### Step 8: Tests

Comprehensive test coverage for all functionality.

Files:

- `scanner/tests/walker.test.ts`
- `scanner/tests/classifier.test.ts`
- `scanner/tests/routes.test.ts`
- `scanner/tests/layouts.test.ts`
- `scanner/tests/scanner.test.ts`
- `scanner/tests/watcher.test.ts`

## Edge Cases

1. **Empty pages directory** - Return empty manifest, no error
2. **No layouts** - Pages have empty layout chains
3. **Deeply nested directories** - Support arbitrary nesting depth
4. **Duplicate routes** - Error if two files map to same route
5. **Non-existent directory** - Throw descriptive error (pages), ignore (public)
6. **Symlinks** - Follow symlinks (default `@std/fs` behavior)
7. **Missing system files** - Return null, use defaults downstream
8. **No public directory** - Return empty publicAssets array
9. **Rapid file changes** - Debounce to single event

## Dependencies

- `@std/fs` - File system operations (already in imports)
- `@std/path` - Path manipulation (already in imports)
- `@std/async` - Debounce utility (already in imports)

No new dependencies required.

## Test Strategy

Use fixture directories for realistic testing:

```
scanner/tests/fixtures/
├── basic/
│   ├── pages/
│   │   ├── index.md
│   │   └── about.tsx
│   └── public/
│       └── favicon.ico
├── full/
│   ├── pages/
│   │   ├── _html.tsx
│   │   ├── _not-found.tsx
│   │   ├── _error.tsx
│   │   ├── _layout.tsx
│   │   ├── index.md
│   │   └── blog/
│   │       ├── _layout.tsx
│   │       └── post.md
│   ├── public/
│   │   └── images/
│   │       └── logo.png
│   └── uno.config.ts
├── empty/
│   └── pages/
└── edge-cases/
    └── pages/
        ├── _private.tsx      # Should be ignored
        └── _layout.tsx       # Should be included
```

Watch mode tests use temporary directories with programmatic file operations.

## Success Criteria

1. All file conventions correctly handled
2. System files discovered with null fallbacks
3. Public assets mapped to URL paths
4. Routes generated correctly for all cases
5. Layout chains built in correct order
6. Watch mode emits correct events
7. Edge cases handled gracefully
8. 90%+ test coverage
9. No new dependencies

## Estimated Scope

- 8 implementation files
- 6 test files
- ~500-600 lines of production code
- ~600-700 lines of test code

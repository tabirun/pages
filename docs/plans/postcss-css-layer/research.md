# Research: Replace UnoCSS with Generic PostCSS Layer

## Task

Replace the current built-in UnoCSS integration with a generic PostCSS CSS
processing layer in @tabirun/pages. This eliminates version mismatch issues when
users install their own UnoCSS presets or other PostCSS plugins, and makes the
framework CSS-framework-agnostic.

## Codebase Overview

@tabirun/pages is a static site generator built on Preact and Deno, with
file-based routing and markdown-first content. The framework currently includes
UnoCSS as a built-in feature, which creates dependency conflicts.

### Tech Stack

- Deno runtime with JSR package publishing
- Preact for UI components and SSR
- esbuild for JavaScript bundling
- Shiki for syntax highlighting
- UnoCSS (to be replaced) for utility CSS generation
- File-based routing with nested layouts

### Relevant Directories

- `unocss/` - Current UnoCSS integration (to be replaced/removed)
- `build/` - Production build pipeline (integrates UnoCSS compilation)
- `dev/` - Development server (runs UnoCSS in subprocess)
- `scanner/` - File discovery (detects uno.config.ts)
- `pages/` - Public API factory and configuration

## Relevant Files

| File                                                                     | Relevance                                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `/Users/leecheneler/projects/tabirun/pages/unocss/compiler.ts`           | Core UnoCSS compilation logic - template for PostCSS implementation     |
| `/Users/leecheneler/projects/tabirun/pages/unocss/compile-subprocess.ts` | Subprocess execution for isolated dependency resolution                 |
| `/Users/leecheneler/projects/tabirun/pages/scanner/source-scanner.ts`    | Scans project files for class usage (UnoCSS-specific, may need changes) |
| `/Users/leecheneler/projects/tabirun/pages/scanner/scanner.ts`           | Detects uno.config.ts at project root                                   |
| `/Users/leecheneler/projects/tabirun/pages/scanner/types.ts`             | SystemFiles interface includes unoConfig field                          |
| `/Users/leecheneler/projects/tabirun/pages/build/builder.ts`             | Production build - compiles UnoCSS and injects stylesheet               |
| `/Users/leecheneler/projects/tabirun/pages/dev/build-page.ts`            | Dev subprocess - compiles UnoCSS per page request                       |
| `/Users/leecheneler/projects/tabirun/pages/dev/server.ts`                | Dev server - serves CSS from `__styles/` directory                      |
| `/Users/leecheneler/projects/tabirun/pages/pages/config.ts`              | Configuration schema (may need CSS-related options)                     |

## Existing Patterns

### UnoCSS Integration Pattern

The current UnoCSS integration follows this architecture:

```typescript
// 1. Scanner discovers uno.config.ts at project root
systemFiles.unoConfig = "/project/uno.config.ts";

// 2. Compilation runs in subprocess to isolate dependencies
async function compileInSubprocess(
  configPath: string,
  projectRoot: string,
  projectConfig: string,
): Promise<string> {
  // Runs with --config to resolve project deps (presets)
  // Returns JSON: { success: true, css: string }
}

// 3. CSS written to __styles/ with content hash
const hash = await generateContentHash(css);
const filename = `${hash}.css`;
const publicPath = `${basePath}/__styles/${filename}`;

// 4. Stylesheet injected before </head>
html = injectStylesheet(html, publicPath);
```

### Subprocess Isolation Pattern

Critical insight from commit `2ac225d`: The framework uses subprocesses to avoid
version conflicts.

**Problem:** Using `--config` for the entire build caused the project's Preact
version to be loaded instead of the framework's Preact, breaking context
providers.

**Solution:** Run UnoCSS compilation in a separate subprocess with `--config` to
resolve project dependencies (presets), while the main build subprocess runs
without `--config`.

This same pattern will be needed for PostCSS to allow users to install PostCSS
plugins without version conflicts.

### File Scanning Pattern

```typescript
// Scans entire project root for source files
const sourceContent = await scanSourceContent(projectRoot);

// Filters by extension and skips test files
const SCAN_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".md", ".html"];
const SKIP_DIRECTORIES = ["node_modules", ".tabi", ".git", "dist"];
```

**Note:** This scanning is UnoCSS-specific (extracts class names from source).
PostCSS doesn't need content scanning - it processes a CSS entry file directly.

### Asset Namespace Convention

From ADR-006, the framework uses reserved namespaces:

- `/__tabi/` - Client JavaScript bundles
- `/__styles/` - Generated CSS files

Both use content hashing for cache busting in production.

## Documentation Found

### Vision

From `/Users/leecheneler/projects/tabirun/pages/docs/VISION.md`:

**Core Principles:**

1. Single rendering pipeline - All content flows through the same path
2. Markdown-first - Optimized for docs/blogs
3. Preact for interactivity
4. Simple over clever - Minimal API surface

**Non-Goals:**

- Not infinitely configurable - Sensible defaults, escape hatches when needed

This aligns with making CSS processing generic rather than opinionated about
UnoCSS.

### ADRs

**ADR-006: Asset Namespace Convention**

- Framework assets use underscore-prefixed paths (`/__tabi/`, `/__styles/`)
- Content hashing for cache busting in production
- No conflicts with user routes (underscore is reserved)

**Relevant:** PostCSS output should continue using `/__styles/` namespace with
content hashing.

### Existing Plans

No existing plans found for CSS processing changes.

## Key Considerations

### 1. Version Isolation is Critical

The subprocess pattern exists specifically to prevent version mismatches between
framework dependencies and user dependencies. This was learned through pain
(commit `2ac225d`).

**For PostCSS:**

- User installs `postcss`, plugins (Tailwind, autoprefixer, etc.) in their
  project
- Framework must NOT include these as dependencies
- Compilation must run in subprocess with user's `--config` to resolve their
  plugins
- Main build continues without `--config` to use framework's Preact version

### 2. Configuration Convention

Current: `uno.config.ts` at project root (detected by scanner)

**Options for PostCSS:**

1. `postcss.config.ts` at project root (standard convention)
2. Allow configuration in `pages()` factory (less standard, more flexible)
3. Both (config file takes precedence)

**Recommendation:** Start with just `postcss.config.ts` detection. This is the
standard PostCSS convention and keeps the API simple.

### 3. CSS Entry Point

UnoCSS generates CSS from scanning source files. PostCSS processes an existing
CSS file.

**Required:** Users must specify a CSS entry point.

**Options:**

1. Fixed convention: `styles/main.css` or `styles/index.css`
2. Configurable in `postcss.config.ts` (non-standard)
3. Configurable in `pages()` factory
4. Detect `*.css` in a standard location

**Recommendation:** Use configuration in `pages()` factory with a sensible
default:

```typescript
pages({
  css: {
    entry: "./styles/main.css", // default: "./styles/index.css"
  },
});
```

This is flexible and discoverable without forcing a specific file structure.

### 4. Scanner Changes

Current scanner:

- Scans all source files for class names (UnoCSS-specific)
- Detects `uno.config.ts`

**Needed changes:**

- Replace `unoConfig` field with `postcssConfig`
- Remove source scanning (not needed for PostCSS)
- Detect `postcss.config.ts` at project root

### 5. Hot Reload Behavior

Current: UnoCSS recompiles on any source file change (watches for class usage)

**PostCSS:** Should recompile only when:

- CSS entry file changes
- Any imported CSS file changes (via `@import`)
- `postcss.config.ts` changes

This requires the file watcher to trigger on CSS file changes, not all source
changes.

### 6. Breaking Changes

**Major breaking change:** Users with existing `uno.config.ts` will need to
migrate.

**Migration path:**

1. Install PostCSS and UnoCSS as project dependencies
2. Rename `uno.config.ts` → `postcss.config.ts`
3. Wrap UnoCSS config in PostCSS plugin format
4. Create CSS entry file with `@unocss` directive

Example migration:

```typescript
// Before: uno.config.ts
export default {
  rules: [
    ["p-sm", { padding: "0.5rem" }],
  ],
};

// After: postcss.config.ts
import unocss from "@unocss/postcss";

export default {
  plugins: [
    unocss({
      rules: [
        ["p-sm", { padding: "0.5rem" }],
      ],
    }),
  ],
}; // After: styles/index.css
```

### 7. Build Pipeline Integration

**Production build** (`build/builder.ts`):

- Replace `compileUnoCSS()` call with `compilePostCSS()`
- Same output structure: `__styles/{hash}.css`
- Same injection mechanism

**Development** (`dev/build-page.ts`):

- Replace UnoCSS subprocess with PostCSS subprocess
- Same caching strategy (write to `.tabi/__styles/`)
- Same HMR trigger (CSS changes reload page)

### 8. Subprocess Architecture

Template from UnoCSS implementation:

```typescript
// Main process
const css = await compileInSubprocess(
  cssEntry, // e.g., "./styles/index.css"
  postcssConfig, // e.g., "./postcss.config.ts"
  projectConfig, // e.g., "./deno.json" (for plugin resolution)
);

// Subprocess (postcss-subprocess.ts)
// 1. Load postcss.config.ts with --config (resolves user's plugins)
// 2. Read CSS entry file
// 3. Run PostCSS with config
// 4. Output JSON: { success: true, css: string }
```

## Recommended Approach

### Phase 1: Create PostCSS Module

1. **Create `css/` directory** (replace `unocss/`)
   - `css/compiler.ts` - Main compilation logic
   - `css/subprocess.ts` - Isolated PostCSS execution
   - `css/tests/compiler.test.ts` - Test coverage

2. **Implement compilation API:**
   ```typescript
   interface CSSCompileOptions {
     entryPath: string; // CSS entry file
     configPath: string; // postcss.config.ts
     projectRoot: string; // For @import resolution
     outDir: string; // Output directory
     basePath?: string; // URL prefix
     projectConfig?: string; // For plugin resolution
   }

   async function compileCSS(
     options: CSSCompileOptions,
   ): Promise<CSSCompileResult>;
   ```

3. **Subprocess script:**
   - Load PostCSS config with dynamic import (respects --config)
   - Process CSS entry file
   - Handle `@import` resolution
   - Return JSON result

### Phase 2: Update Scanner

1. **Modify `scanner/types.ts`:**
   ```typescript
   interface SystemFiles {
     html: string | null;
     notFound: string | null;
     error: string | null;
     postcssConfig: string | null; // was: unoConfig
   }
   ```

2. **Update `scanner/scanner.ts`:**
   - Detect `postcss.config.ts` instead of `uno.config.ts`
   - Remove source content scanning (not needed)

3. **Update `scanner/watcher.ts`:**
   - Watch for CSS file changes
   - Category: `cssFile` instead of `unoConfig`

### Phase 3: Update Build Pipeline

1. **Modify `build/builder.ts`:**
   - Replace `compileUnoCSS()` with `compileCSS()`
   - Pass CSS entry path from config
   - Keep same injection logic

2. **Modify `dev/build-page.ts`:**
   - Replace UnoCSS compilation with CSS compilation
   - Same subprocess pattern
   - Same caching to `.tabi/__styles/`

### Phase 4: Update Configuration

1. **Add to `pages/config.ts`:**
   ```typescript
   const CSSOptionsSchema = z.object({
     entry: z.string().default("./styles/index.css"),
   });

   export const PagesConfigSchema = z.object({
     // ... existing fields
     css: CSSOptionsSchema.optional(),
   });
   ```

2. **Update `pages/factory.ts`:**
   - Pass CSS config to build/dev functions

### Phase 5: Migration & Cleanup

1. **Update examples:**
   - Convert `examples/05-unocss/` to `examples/05-postcss-unocss/`
   - Add `examples/06-postcss-tailwind/`

2. **Update documentation:**
   - README with PostCSS setup instructions
   - Migration guide for existing UnoCSS users
   - Add ADR documenting the change

3. **Remove UnoCSS:**
   - Delete `unocss/` directory
   - Remove `@unocss/core` dependency from `deno.json`
   - Update publish includes

## Open Questions

**Q1: Should we support multiple CSS entry files?**

- Current thinking: Start with single entry, can expand later if needed
- Most use cases: one main stylesheet, everything else via `@import`

**Q2: Should we validate that `postcss.config.ts` exports a valid config?**

- Current thinking: Let PostCSS handle validation, bubble up errors
- Framework shouldn't validate third-party config schemas

**Q3: What should happen if CSS entry file doesn't exist?**

- Current thinking: If `postcss.config.ts` exists but no entry file, treat as
  build error
- If neither exists, skip CSS compilation entirely (no stylesheet injected)

**Q4: Should we watch CSS imports for changes?**

- Current thinking: Yes, but hard to implement without parsing CSS
- Initial implementation: reload on CSS entry file change only
- Future: use PostCSS dependency graph if available

**Q5: Should PostCSS be a framework dependency?**

- Current thinking: NO - users install it as project dependency
- Framework only runs the subprocess, doesn't import PostCSS directly
- This prevents version conflicts

## Migration Considerations

### For Users

**Breaking change announcement:**

````markdown
## v0.6.0 - Breaking Changes

### UnoCSS No Longer Built-In

The framework no longer includes UnoCSS as a built-in dependency. This change:

- Eliminates version conflicts with UnoCSS presets
- Makes the framework CSS-framework-agnostic
- Supports any PostCSS-based workflow (Tailwind, UnoCSS, vanilla PostCSS, etc.)

**Migration Guide:**

1. Install PostCSS and your preferred CSS framework:
   ```bash
   deno add npm:postcss npm:@unocss/postcss
   ```
````

2. Rename your config:
   ```bash
   mv uno.config.ts postcss.config.ts
   ```

3. Update config format:
   ```typescript
   // postcss.config.ts
   import unocss from "@unocss/postcss";
   import yourUnoConfig from "./uno-rules.ts";

   export default {
     plugins: [unocss(yourUnoConfig)],
   };
   ```

4. Create CSS entry file:
   ```css
   /* styles/index.css */
   @unocss;
   ```

5. Configure entry in pages:
   ```typescript
   pages({
     css: { entry: "./styles/index.css" },
   });
   ```

```
### Deprecation Strategy

**Option 1: Hard break in v0.6.0**
- Remove UnoCSS entirely
- Users must migrate immediately
- Simpler for framework maintenance

**Option 2: Deprecation period**
- v0.6.0: Add PostCSS support, deprecate UnoCSS (both work)
- v0.7.0: Remove UnoCSS
- More user-friendly but maintains dual code paths

**Recommendation:** Option 1 (hard break) given the framework is pre-1.0 and the change is necessary for architectural health.

## Next Steps

After research approval:

1. Create detailed implementation plan with commit breakdown
2. Create ADR documenting decision to move to PostCSS
3. Implement Phase 1 (PostCSS module)
4. Update integration points (build, dev, scanner)
5. Create migration guide and examples
6. Update all documentation
```

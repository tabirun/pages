# Plan: Replace UnoCSS with Generic PostCSS Layer

## Metadata

- **Task:** Replace the built-in UnoCSS integration with a generic PostCSS CSS
  processing layer that allows users to bring their own PostCSS plugins
- **Branch:** feat/postcss-css-layer
- **Status:** IN_PROGRESS
- **Created:** 2025-12-18

## Summary

This plan removes the built-in UnoCSS dependency and replaces it with a generic
PostCSS compilation layer. Users will install PostCSS and their preferred
plugins (UnoCSS, Tailwind, etc.) as project dependencies, while the framework
provides CSS processing infrastructure. This eliminates version conflicts and
makes the framework CSS-framework-agnostic while preserving the critical
subprocess isolation pattern.

## Commits

### 1. Add CSS configuration schema to pages config

**Goal:** Extend the pages configuration to accept CSS entry point options
before implementing the CSS compiler.

**Files:**

- Modify: `pages/config.ts` - Add `CSSOptionsSchema` with `entry` field
  (default: `./styles/index.css`)
- Modify: `pages/types.ts` - Export `CSSOptionsConfig` type and extend
  `PagesConfig` interface

**Checklist:**

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** 83fa8cb

---

### 2. Create PostCSS compiler module

**Goal:** Implement the core CSS compilation logic with subprocess isolation,
mirroring the UnoCSS architecture but adapted for PostCSS entry files.

**Files:**

- Create: `css/compiler.ts` - Main compilation API (`compileCSS`,
  `injectStylesheet`)
- Create: `css/subprocess.ts` - PostCSS subprocess script for isolated execution
- Create: `css/tests/compiler.test.ts` - Test coverage for compilation and
  injection

**Notes:**

- Use same `__styles/` namespace and content hashing as UnoCSS
- Subprocess loads `postcss.config.ts` with `--config` for plugin resolution
- Process CSS entry file (not source scanning like UnoCSS)
- Return same result structure: `{ css, outputPath, publicPath }`
- Copy `injectStylesheet` function from UnoCSS (same logic, different purpose)

**Checklist:**

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** 91dcbec

---

### 3. Update scanner to detect postcss.config.ts

**Goal:** Change scanner to detect PostCSS config instead of UnoCSS config and
remove source content scanning.

**Files:**

- Modify: `scanner/types.ts` - Rename `unoConfig` to `postcssConfig` in
  `SystemFiles` and `FileCategory`
- Modify: `scanner/scanner.ts` - Detect `postcss.config.ts` instead of
  `uno.config.ts`
- Modify: `scanner/watcher.ts` - Update file category from `unoConfig` to
  `postcssConfig`
- Modify: `scanner/tests/scanner.test.ts` - Update tests for `postcssConfig`
  field
- Modify: `scanner/tests/watcher.test.ts` - Update tests for `postcssConfig`
  category
- Modify: `scanner/README.md` - Update documentation for `postcssConfig`

**Notes:**

- Keep the same detection pattern (file at project root)
- `scanner/source-scanner.ts` deletion moved to commit 7 (still imported by
  UnoCSS)

**Checklist:**

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** cdd6bcc

---

### 4. Update production build pipeline

**Goal:** Replace UnoCSS compilation with PostCSS compilation in the production
build.

**Files:**

- Modify: `build/builder.ts` - Replace `compileUnoCSS` import and call with
  `compileCSS`
- Modify: `build/types.ts` - Update `BuildSiteOptions` to include
  `cssEntry?: string`

**Notes:**

- Pass `cssEntry` from pages config (via factory)
- Keep same injection logic and output structure
- If `postcssConfig` exists but no `cssEntry`, skip CSS compilation
- Build works the same: compile once, write to `__styles/`, inject stylesheet

**Checklist:**

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** 035126d

---

### 5. Update development server pipeline

**Goal:** Replace UnoCSS compilation with PostCSS compilation in the dev server
subprocess.

**Files:**

- Modify: `dev/build-page.ts` - Replace `compileUnoCSS` with `compileCSS`
- Modify: `dev/server.ts` - Update `DevServerOptions` to include
  `cssEntry?: string`

**Notes:**

- Subprocess pattern remains the same for version isolation
- Still cache CSS output to `.tabi/__styles/`
- Still inject stylesheet into rendered HTML
- CSS entry file from config passed via args

**Checklist:**

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** a57b510

---

### 6. Update pages factory to pass CSS configuration

**Goal:** Wire CSS configuration from pages config through to build and dev
functions.

**Files:**

- Modify: `pages/factory.ts` - Extract `cssEntry` from config, pass to
  `buildSite` and `registerDevServer`
- Modify: `dev/server.ts` - Accept and forward `cssEntry` option to build
  subprocess

**Notes:**

- Default to `./styles/index.css` from schema
- Pass absolute resolved path to builder
- Dev server needs to pass via subprocess args

**Checklist:**

- [x] Dev
- [x] Review
- [x] Present
- [x] Commit

**SHA:** b4a8980

---

### 7. Remove UnoCSS module and dependencies

**Goal:** Clean up all UnoCSS-specific code now that PostCSS replacement is
fully integrated.

**Files:**

- Delete: `unocss/compiler.ts`
- Delete: `unocss/compile-subprocess.ts`
- Delete: `unocss/tests/compiler.test.ts`
- Delete: `unocss/` (entire directory)
- Modify: `deno.json` - Remove `@unocss/core` from imports
- Modify: `deno.json` - Remove `unocss/` from publish includes, add `css/`

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

### 8. Create migration guide and ADR

**Goal:** Document the breaking change with migration instructions and
architectural decision.

**Files:**

- Create: `docs/ADR-007-postcss-css-layer.md` - Document decision to replace
  UnoCSS with PostCSS
- Create: `docs/MIGRATION-v0.6.md` - Migration guide for users upgrading from
  v0.5.x
- Modify: `README.md` - Update CSS setup instructions for PostCSS

**Notes:**

- ADR should explain version conflict problem and subprocess solution
- Migration guide needs step-by-step for UnoCSS users
- Include examples for UnoCSS PostCSS plugin and Tailwind
- README should show minimal PostCSS setup

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

### 9. Update example projects

**Goal:** Provide working examples showing PostCSS usage with both UnoCSS and
Tailwind.

**Files:**

- Modify: `examples/05-unocss/` - Convert to PostCSS + UnoCSS plugin setup
- Create: `examples/06-tailwind/` - New example with Tailwind CSS via PostCSS

**Notes:**

- Example 05 demonstrates migration path for existing UnoCSS users
- Example 06 shows PostCSS flexibility (any framework works)
- Both should include `postcss.config.ts`, CSS entry file, and updated `pages()`
  config
- Include README in each example explaining the setup

**Checklist:**

- [ ] Dev
- [ ] Review
- [ ] Present
- [ ] Commit

**SHA:** _pending_

---

## Dependencies

None - all work is internal to the framework.

## Risks

**Risk: PostCSS subprocess may fail if user doesn't install PostCSS**

- Mitigation: Clear error messages, documentation emphasizes PostCSS is required
- Detection: Check for `postcssConfig` file and provide helpful error if PostCSS
  not installed

**Risk: CSS import resolution may differ across environments**

- Mitigation: Use PostCSS's standard resolution, document `@import` behavior
- Note: PostCSS handles this natively, framework just runs the process

**Risk: Breaking change may frustrate users with existing UnoCSS setups**

- Mitigation: Detailed migration guide with exact steps
- Timing: Framework is pre-1.0, architectural health takes priority
- Communication: Clearly mark as breaking change in release notes

**Risk: Subprocess pattern complexity increases debugging difficulty**

- Mitigation: Preserve JSON error output format, include stack traces
- Existing pattern from UnoCSS already works well

## Out of Scope

- Watching CSS `@import` dependencies for hot reload (initial: reload only on
  entry file change)
- Supporting multiple CSS entry files (single entry + `@import` is sufficient)
- Built-in CSS optimization/minification (users configure via PostCSS plugins)
- CSS file watching beyond entry file (future enhancement via PostCSS dependency
  graph)
- Backward compatibility with `uno.config.ts` (clean break)

## Notes

### Subprocess Isolation is Critical

The subprocess pattern exists specifically to prevent version mismatches. When
users install PostCSS plugins (like `@unocss/postcss` or `tailwindcss`) in their
project, those must resolve from the user's dependencies, not the framework's.
Running CSS compilation in a subprocess with `--config` pointing to the user's
`deno.json` ensures correct plugin resolution while keeping the main build
process using the framework's Preact version.

### Configuration Philosophy

Following the framework's "simple over clever" principle:

- PostCSS config uses standard `postcss.config.ts` convention
- CSS entry point configured in `pages()` factory (explicit, discoverable)
- Default entry path `./styles/index.css` (sensible, common pattern)
- No magic file detection - if you want CSS processing, configure it

### Testing Strategy

- Unit tests for CSS compiler (mocked PostCSS configs)
- Integration tests for subprocess execution
- Scanner tests for config detection
- Build pipeline tests for end-to-end flow
- Example projects serve as acceptance tests

### Version Bump

This will be released as **v0.6.0** (breaking change, pre-1.0 framework).

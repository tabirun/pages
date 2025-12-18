# ADR 008: Generic PostCSS CSS Layer

## Status

Accepted

## Context

The framework previously bundled UnoCSS as a built-in dependency for CSS
processing. This caused several problems:

1. **Version conflicts** - Framework's UnoCSS version could conflict with user's
   preferred version or plugins
2. **Limited choice** - Users who preferred Tailwind, vanilla CSS, or other CSS
   solutions had no clean path
3. **Maintenance burden** - Framework maintainers had to track UnoCSS updates
   and handle breaking changes
4. **Subprocess isolation** - UnoCSS was already running in a subprocess to
   isolate its dependencies; this pattern works equally well for any CSS tool

## Decision

**Replace built-in UnoCSS with a generic PostCSS processing layer.**

Users install PostCSS and their preferred plugins in their project, while the
framework provides the compilation infrastructure.

### Configuration

1. **CSS entry point** - Configured in `pages()` factory:

   ```typescript
   const { dev, build } = pages({
     css: { entry: "./styles/index.css" },
   });
   ```

2. **PostCSS config** - Standard `postcss.config.ts` at project root:

   ```typescript
   import type { Config } from "postcss";
   import unocss from "@unocss/postcss";

   export default {
     plugins: [unocss()],
   } satisfies Config;
   ```

### Compilation Flow

```
postcss.config.ts detected
        ↓
CSS entry file read
        ↓
PostCSS subprocess (--config=user's deno.json)
        ↓
Plugins resolve from user's dependencies
        ↓
Output to __styles/[hash].css
        ↓
Inject <link> into HTML
```

### Subprocess Isolation

The subprocess pattern is critical:

- Parent process (framework) uses framework's Preact version
- Subprocess uses `--config` flag pointing to user's `deno.json`
- PostCSS plugins resolve from user's `node_modules`
- No version conflicts between framework and user dependencies

### Output Structure

```
__styles/
└── main-a1b2c3d4.css    # Content-hashed output
```

Same namespace pattern as bundles (`__tabi/`), enabling unified cache config.

## Consequences

### Positive

- **Any CSS tool works** - Tailwind, UnoCSS, vanilla PostCSS plugins
- **No version conflicts** - Users control all CSS-related dependencies
- **Simpler framework** - One less bundled dependency to maintain
- **Standard tooling** - PostCSS is the de facto CSS processing standard
- **Better debugging** - Users can test PostCSS config independently

### Negative

- **More setup required** - Users must install PostCSS and configure plugins
- **Breaking change** - Existing UnoCSS users must migrate

### Neutral

- **Subprocess overhead** - Same as before (already using subprocess for UnoCSS)
- **No source scanning** - Users write CSS directly instead of utility classes
  being extracted (can use UnoCSS PostCSS plugin for this workflow)

## Alternatives Considered

### 1. Keep UnoCSS as built-in

Rejected: Version conflict issues are fundamental to bundling CSS tools.

### 2. Support multiple built-in CSS tools

Rejected: Exponentially increases maintenance burden and still has version
issues.

### 3. No CSS processing (pure static files)

Rejected: Modern CSS workflows require processing for imports, nesting,
prefixing.

### 4. esbuild CSS bundling

Rejected: Less flexible than PostCSS, fewer plugins available.

## Migration

See `docs/MIGRATION-v0.6.md` for step-by-step migration instructions.

## Related

- Plan: postcss-css-layer
- ADR-005: Client Bundle Architecture (similar subprocess pattern)
- ADR-006: Asset Namespace Convention (`__styles/` follows same pattern)

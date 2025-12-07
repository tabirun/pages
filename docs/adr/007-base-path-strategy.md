# ADR 007: Base Path Strategy

## Status

Accepted

## Context

Applications need to be deployable at custom path prefixes (e.g.,
`https://example.com/docs/` instead of root). This requires handling URLs
appropriately across HTML, CSS, and other assets.

Three approaches were considered:

1. **Fully explicit** - Users provide basePath for all internal references
2. **Framework components** - Custom `<Link>`, `<Image>` components that
   auto-prefix (Next.js approach)
3. **Auto-prefix with opt-out** - Automatically prefix all root-relative paths
   with escape hatch

## Decision

**Use fully explicit basePath - users are responsible for all URL prefixing.**

The build system only handles asset hashing. Users must apply basePath to all
URLs in their Preact components, CSS, and markdown.

### How it works

**Configuration:**

```typescript
const { build, serve } = pages({
  basePath: "/docs",
});
```

**User responsibility:**

Users apply basePath to all internal URLs:

```tsx
// Preact components - use context hook
import { useBasePath } from "@tabirun/pages";

function MyComponent() {
  const basePath = useBasePath();
  return (
    <>
      <a href={`${basePath}/about`}>About</a>
      <img src={`${basePath}/logo.png`} />
    </>
  );
}
```

```css
/* CSS - hardcode or use preprocessor */
.hero {
  background: url("/docs/images/hero.png");
}
```

```md
<!-- Markdown -->

[About](/docs/about) ![Logo](/docs/logo.png)
```

**Build system responsibility:**

Asset hashing only. The HTML and CSS rewriters replace paths in the asset map
with their hashed equivalents:

```html
<!-- Input (user wrote basePath) -->
<img src="/docs/logo.png">

<!-- Output (build added hash) -->
<img src="/docs/logo-A1B2C3D4.png">
```

### Asset map structure

Keys and values both include basePath (matching what users write):

```typescript
{
  "/docs/logo.png": "/docs/logo-A1B2C3D4.png",
  "/docs/styles.css": "/docs/styles-B2C3D4E5.css"
}
```

### Serving

The serve function strips basePath from incoming requests to map to filesystem
paths:

- Request: `/docs/logo-A1B2C3D4.png`
- Strip basePath: `/logo-A1B2C3D4.png`
- Serve: `dist/logo-A1B2C3D4.png`

## Consequences

### Positive

- **No magic** - What you write is what you get
- **Predictable** - No framework interference with URLs
- **Simple implementation** - Build only does hash replacement
- **Full control** - Users decide exactly how to handle basePath
- **Flexible** - Works with any CSS approach (vanilla, preprocessors, CSS-in-JS)

### Negative

- **Verbose** - Must include basePath everywhere
- **Easy to forget** - Missing basePath causes broken links
- **CSS is awkward** - No good templating solution for vanilla CSS

### Neutral

- **Build-time only** - basePath cannot change without rebuilding

## Alternatives Considered

### 1. Auto-prefix with opt-out attribute

```html
<a href="/about">About</a>           <!-- auto-prefixed -->
<a href="/api" data-tabi-external>   <!-- opted out -->
```

Rejected because:

- Magic by default - harder to reason about
- Edge cases with same-origin external links
- Escape hatch adds complexity
- Framework will grow beyond static sites, explicit is safer long-term

### 2. Framework components (Next.js approach)

```tsx
import { Link, Image } from "@tabirun/pages";

<Link href="/about">About</Link>
<Image src="/logo.png" />
```

Rejected because:

- Requires custom component for each element type
- Inconsistent - Next.js `<Link>` auto-prefixes but `<Image>` doesn't
- Users must remember which component to use
- More code to ship and maintain

### 3. Auto-prefix in CSS only

Since CSS cannot template, auto-prefix `url()` values.

Rejected because:

- Inconsistent with HTML/markdown behavior
- Users expect same rules everywhere

## Related

- ADR-006: Asset Namespace Convention
- Plan: base-path.md

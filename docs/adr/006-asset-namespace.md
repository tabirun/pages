# ADR 006: Asset Namespace Convention

## Status

Accepted

## Context

Framework-generated assets (client bundles, sourcemaps) need a URL path that:

1. Won't conflict with user routes or public assets
2. Is clearly identifiable as framework-internal
3. Allows easy cache configuration (e.g., immutable caching for hashed files)

## Decision

**Use `/_tabi/` as the namespace for all framework-generated assets.**

### URL Structure

```
/_tabi/
├── index.js              # Dev: client bundle for /
├── index-a1b2c3d4.js     # Prod: content-hashed
├── about.js
└── blog/
    └── post.js
```

### Why Underscore Prefix

The scanner already reserves underscore-prefixed files for framework use:

- `_layout.tsx` - Layout components
- `_html.tsx` - Custom document
- `_not-found.tsx` - 404 page
- `_error.tsx` - Error boundary

Users cannot create a page at `/pages/_tabi.tsx` or `/pages/_tabi/anything.tsx`
because underscore files are framework-reserved. This guarantees no route
conflicts.

### Output Locations

**Development (.tabi/ working directory):**

```
.tabi/
└── client/
    └── blog/
        └── post.js
```

Served at `/_tabi/blog/post.js`

**Production (dist/ output):**

```
dist/
├── blog/
│   └── post/
│       └── index.html
└── _tabi/
    └── blog/
        └── post-a1b2c3d4.js
```

### Cache Configuration

Static hosts can easily configure caching:

```nginx
# All /_tabi/ assets are immutable (content-hashed in production)
location /_tabi/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## Consequences

### Positive

- **No conflicts** - Underscore prefix is already reserved
- **Clear intent** - Obviously framework-internal, not user content
- **Cache-friendly** - Single location for immutable assets
- **Familiar pattern** - Similar to Next.js `/_next/`

### Negative

- **Visible in URLs** - Users see `/_tabi/` in network tab (acceptable)

### Neutral

- **Naming choice** - Could be `/_app/`, `/_assets/`, etc. `_tabi` chosen for
  brand consistency

## Alternatives Considered

### 1. `/assets/` or `/js/`

Could conflict with user's public directory structure. Users might have
`/public/assets/` or want `/js/` routes.

### 2. Colocate with HTML (`/blog/post.js`)

Messy output, harder to configure caching separately from HTML files.

### 3. Hidden directory (`/.tabi/`)

Some static hosts don't serve dotfiles. Would require special configuration.

### 4. Hash-only filenames at root (`/a1b2c3d4.js`)

No structure, hard to debug, no clear framework association.

## Related

- ADR-005: Client Bundle Architecture
- Plan: bundler-module.md

# ADR 003: Universal Hydration

## Status

Accepted

## Context

Should markdown pages ship JavaScript for hydration, or be purely static HTML?

Astro's approach: markdown pages are static by default, opt-in interactivity via
"islands".

Alternative: all pages hydrate (both `.md` and `.tsx`).

## Decision

**All pages hydrate.**

Layouts are Preact components that commonly need interactivity:

- Mobile nav toggle
- Theme switcher (light/dark mode)
- Search modal
- Accordion/collapsible sections

Since layouts wrap all pages (including markdown), we need hydration for layouts
to work. Making some pages static and others hydrated creates complexity.

## Consequences

**Positive:**

- Layouts always work (interactivity guaranteed)
- Single rendering path
- No "why doesn't my button work on this page" surprises
- Simpler mental model

**Negative:**

- Larger bundle for pure content pages
- More JS shipped than strictly necessary
- Not as lightweight as static-only markdown

## Future Consideration

If bundle size becomes a concern, we could:

1. Tree-shake unused layout code per page
2. Add opt-out: `hydrate: false` in frontmatter
3. Implement partial hydration (islands)

For now, simplicity wins.

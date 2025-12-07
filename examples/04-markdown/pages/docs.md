---
title: Documentation
description: Project documentation in markdown
---

# Documentation

This is a **markdown** page. Markdown pages support:

- Frontmatter for metadata (title, description, etc.)
- Full GitHub-flavored markdown syntax
- Code blocks with syntax highlighting

## Code Example

```typescript
const greeting = "Hello from markdown!";
console.log(greeting);
```

## Frontmatter

Markdown pages use YAML frontmatter at the top:

```yaml
---
title: Documentation
description: Project documentation in markdown
---
```

The layout can access this via `useFrontmatter()`.

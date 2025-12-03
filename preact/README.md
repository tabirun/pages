# preact

Preact components and hooks for pages.

## Installation

```typescript
import { Code, useFrontmatter } from "@tabirun/pages/preact";
```

## Components

### Code

Syntax-highlighted code blocks using Shiki.

```tsx
import { Code } from "@tabirun/pages/preact";

<Code lang="typescript">
  const greeting = "Hello";
</Code>;
```

| Prop       | Type     | Description               |
| ---------- | -------- | ------------------------- |
| `lang`     | `string` | Language for highlighting |
| `children` | `string` | Code content              |

## Hooks

### useFrontmatter

Access frontmatter data from the current page context.

```tsx
import { useFrontmatter } from "@tabirun/pages/preact";

function Title() {
  const { title, description } = useFrontmatter();
  return <h1>{title}</h1>;
}
```

## Types

```typescript
interface Frontmatter {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

interface CodeProps {
  lang?: string;
  children?: string;
}
```

## Notes

- Code blocks flow through the unified markdown pipeline
- Components render markers during SSR for post-processing

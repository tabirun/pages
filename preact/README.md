# preact

Preact components, hooks, and re-exports for Tabi Pages.

## Important: Preact Imports

**Always import Preact APIs from `@tabirun/pages/preact`**, not directly from
`preact`. This ensures all code uses the same Preact instance, preventing
version mismatch issues that cause hooks and context to fail.

```tsx
// Correct - use @tabirun/pages/preact
import { Head, useEffect, useState } from "@tabirun/pages/preact";

// Wrong - causes version mismatch errors
import { useState } from "preact/hooks";
```

## JSX Configuration

Configure your `deno.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@tabirun/pages/preact"
  }
}
```

## Re-exports

This module re-exports all commonly used Preact APIs:

### Core

- `h`, `createElement`, `Fragment`, `render`, `hydrate`
- `createContext`, `createRef`, `cloneElement`
- `Component`, `isValidElement`, `toChildArray`, `options`

### Hooks

- `useState`, `useEffect`, `useContext`, `useReducer`
- `useRef`, `useMemo`, `useCallback`
- `useLayoutEffect`, `useImperativeHandle`, `useDebugValue`
- `useErrorBoundary`, `useId`

### SSR

- `renderToString`, `renderToStringAsync`

### Types

- `ComponentChildren`, `ComponentType`, `ComponentChild`
- `ComponentClass`, `FunctionComponent`, `VNode`
- `JSX`, `RefObject`, `RefCallback`, `RenderableProps`

## Tabi Components

### Head

Add elements to the document `<head>`.

```tsx
import { Head } from "@tabirun/pages/preact";

<Head>
  <title>My Page</title>
  <meta name="description" content="Page description" />
</Head>;
```

### Code

Syntax-highlighted code blocks using Shiki.

```tsx
import { Code } from "@tabirun/pages/preact";

<Code lang="typescript">const greeting = "Hello";</Code>;
```

| Prop       | Type     | Description               |
| ---------- | -------- | ------------------------- |
| `lang`     | `string` | Language for highlighting |
| `children` | `string` | Code content              |

## Tabi Hooks

### useFrontmatter

Access frontmatter data from the current page context.

```tsx
import { useFrontmatter } from "@tabirun/pages/preact";

function Title() {
  const { title, description } = useFrontmatter();
  return <h1>{title}</h1>;
}
```

### useBasePath

Access the configured base path.

```tsx
import { useBasePath } from "@tabirun/pages/preact";

function NavLink() {
  const basePath = useBasePath();
  return <a href={`${basePath}/about`}>About</a>;
}
```

## Example

```tsx
import {
  Head,
  useEffect,
  useFrontmatter,
  useState,
} from "@tabirun/pages/preact";

export const frontmatter = {
  title: "Counter",
};

export default function CounterPage() {
  const { title } = useFrontmatter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `${title} - ${count}`;
  }, [title, count]);

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <h1>{title}</h1>
      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
    </>
  );
}
```

## Notes

- Code blocks flow through the unified markdown pipeline
- Components render markers during SSR for post-processing
- `useFrontmatter` works automatically - the framework injects the provider
  during page rendering

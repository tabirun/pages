# Markdown Hydration Cache

## Status

Pending - blocked on client bundle architecture

## Problem

The `Markdown` component preserves SSR content during hydration by querying the
DOM:

```tsx
const existingEl = document.querySelector(`[data-tabi-md="${id}"]`);
const preservedHtml = existingEl?.innerHTML ?? "";
```

This has two issues:

1. **Re-render waste**: Every parent re-render triggers a DOM query, even though
   content hasn't changed.

2. **Unmount/remount breaks**: If the component is conditionally rendered and
   unmounts, the DOM element is removed. On remount, `querySelector` returns
   null and content is lost.

## Current Behavior

- Initial hydration: Works correctly
- Re-renders: Wasteful but functionally correct
- Unmount/remount: Content lost

## Solution Options

### Option A: Module-level Map cache

```tsx
const htmlCache = new Map<string, string>();

export function Markdown({ children = "" }: MarkdownProps): JSX.Element {
  const id = useId();

  if (!isServer && !htmlCache.has(id)) {
    const el = document.querySelector(`[data-tabi-md="${id}"]`);
    htmlCache.set(id, el?.innerHTML ?? "");
  }

  // ...
}
```

Pros:

- Simple, works now
- Survives unmount/remount

Cons:

- Module-level state is awkward
- Memory accumulates (though bounded by component tree size)
- Might be throwaway if client bundle takes different approach

### Option B: Context-based cache

```tsx
const MarkdownCacheContext = createContext<Map<string, string>>(new Map());

export function MarkdownCacheProvider(
  { children }: { children: ComponentChildren },
) {
  const cache = useMemo(() => new Map<string, string>(), []);
  return (
    <MarkdownCacheContext.Provider value={cache}>
      {children}
    </MarkdownCacheContext.Provider>
  );
}
```

Pros:

- More "React-y"
- Scoped to provider, can reset if needed

Cons:

- Requires wrapper component
- More complexity

### Option C: Framework-level serialization + Context (recommended)

During SSR, serialize processed markdown HTML into page data (similar to Next.js
`__NEXT_DATA__`). On hydration, populate a Context provider with this data.
Deeply nested components read from Context instead of querying DOM.

```tsx
// Provider at page root (populated from serialized data)
const MarkdownCacheContext = createContext<Map<string, string>>(new Map());

export function MarkdownCacheProvider({
  initialData,
  children,
}: {
  initialData: Record<string, string>;
  children: ComponentChildren;
}) {
  const cache = useMemo(() => new Map(Object.entries(initialData)), [
    initialData,
  ]);
  return (
    <MarkdownCacheContext.Provider value={cache}>
      {children}
    </MarkdownCacheContext.Provider>
  );
}

// In component - no DOM queries
export function Markdown({ children = "" }: MarkdownProps): JSX.Element {
  const cache = useContext(MarkdownCacheContext);
  const id = useId();

  if (isServer) {
    // Register content for serialization during SSR
    // Actual mechanism TBD with client bundle design
  }

  const preservedHtml = cache.get(id) ?? "";
  return (
    <div
      data-tabi-md={id}
      dangerouslySetInnerHTML={{ __html: preservedHtml }}
    />
  );
}
```

Pros:

- Most robust
- No DOM queries
- Context gives deeply nested components access
- Fits naturally with SSR data flow
- Works for all scenarios

Cons:

- Requires client bundle architecture to be designed first
- Need to design how SSR registers content for serialization

## Recommendation

Defer to Option C when implementing client bundle. The current implementation
works for the common case (static pages that don't unmount/remount markdown).
Document the limitation and revisit during client bundle work.

## Affected Files

- `preact/markdown.tsx`
- `preact/code.tsx` (uses Markdown internally)

## Related

- Client bundle architecture (not yet planned)
- SSR data serialization patterns

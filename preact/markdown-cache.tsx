import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useMemo } from "preact/hooks";

/**
 * Cache mapping markdown component IDs to rendered HTML.
 */
export type MarkdownCache = Map<string, string>;

const MarkdownCacheContext = createContext<MarkdownCache | null>(null);

/**
 * Props for the MarkdownCacheProvider component.
 * @internal
 */
export interface MarkdownCacheProviderProps {
  /** Initial cache data from SSR serialization. */
  initialData: Record<string, string>;
  /** Child components that can access cache via useMarkdownCache. */
  children: ComponentChildren;
}

/**
 * Provides markdown cache data to descendant components.
 *
 * During hydration, this provider is initialized with pre-rendered markdown
 * HTML from the SSR pass. Markdown components read from this cache instead
 * of querying the DOM.
 *
 * @internal This provider is automatically injected by the framework during
 * client hydration. Users should not need to use this directly.
 */
export function MarkdownCacheProvider({
  initialData,
  children,
}: MarkdownCacheProviderProps): JSX.Element {
  const cache = useMemo(
    () => new Map(Object.entries(initialData)),
    [initialData],
  );

  return (
    <MarkdownCacheContext.Provider value={cache}>
      {children}
    </MarkdownCacheContext.Provider>
  );
}

/**
 * Hook to access the markdown cache from context.
 *
 * Returns null on the server (no cache needed) or if called outside
 * a provider. Components should fall back to DOM queries if null.
 *
 * @returns MarkdownCache map or null if not available.
 * @internal
 */
export function useMarkdownCache(): MarkdownCache | null {
  return useContext(MarkdownCacheContext);
}

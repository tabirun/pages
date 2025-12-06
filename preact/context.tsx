import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Frontmatter } from "./types.ts";

const FrontmatterContext = createContext<Frontmatter | null>(null);

/**
 * Props for the FrontmatterProvider component.
 * @internal
 */
export interface FrontmatterProviderProps {
  /** Frontmatter data to provide to descendants. */
  frontmatter: Frontmatter;
  /** Child components that can access frontmatter via useFrontmatter. */
  children: ComponentChildren;
}

/**
 * Provides frontmatter data to descendant components.
 *
 * @internal This provider is automatically injected by the framework during
 * page rendering. Users should not need to use this directly - use the
 * `useFrontmatter` hook instead.
 */
export function FrontmatterProvider({
  frontmatter,
  children,
}: FrontmatterProviderProps): JSX.Element {
  return (
    <FrontmatterContext.Provider value={frontmatter}>
      {children}
    </FrontmatterContext.Provider>
  );
}

/**
 * Hook to access frontmatter data from the current page context.
 *
 * Must be used within a `FrontmatterProvider`. Throws an error if called
 * outside of a provider.
 *
 * @returns Frontmatter object containing page metadata.
 * @throws {Error} If called outside of FrontmatterProvider.
 *
 * @example
 * ```tsx
 * import { useFrontmatter } from "@tabirun/pages/preact";
 *
 * function PageTitle() {
 *   const { title, description } = useFrontmatter();
 *   return <h1>{title}</h1>;
 * }
 * ```
 */
export function useFrontmatter(): Frontmatter {
  const ctx = useContext(FrontmatterContext);
  if (ctx === null) {
    throw new Error("useFrontmatter must be used within FrontmatterProvider");
  }
  return ctx;
}

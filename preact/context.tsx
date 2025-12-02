import type { Frontmatter } from "./types.ts";

/**
 * Hook to access frontmatter data from the current page context.
 *
 * @returns Frontmatter object containing page metadata.
 *
 * @example
 * ```tsx
 * import { useFrontmatter } from "@tabirun/pages/preact";
 *
 * function MyComponent() {
 *   const { title, description } = useFrontmatter();
 *   return <h1>{title}</h1>;
 * }
 * ```
 */
export function useFrontmatter(): Frontmatter {
  throw new Error("Not implemented");
}

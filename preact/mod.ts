/**
 * Preact components and hooks for Tabirun Pages.
 *
 * @module
 *
 * @example
 * ```tsx
 * import { Head, useFrontmatter } from "@tabirun/pages/preact";
 *
 * export default function Page() {
 *   const frontmatter = useFrontmatter();
 *   return (
 *     <>
 *       <Head>
 *         <title>{frontmatter.title}</title>
 *       </Head>
 *       <h1>{frontmatter.title}</h1>
 *     </>
 *   );
 * }
 * ```
 */

export { Code } from "./code.tsx";
export { Head } from "./head.tsx";
export { useBasePath, useFrontmatter } from "./context.tsx";

export type { CodeProps } from "./code.tsx";
export type { DocumentProps } from "../renderer/types.ts";
export type { HeadProps } from "./head.tsx";
export type { Frontmatter } from "./types.ts";
export type { LayoutProps } from "../loaders/types.ts";

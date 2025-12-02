import type { CodeProps } from "./types.ts";

/**
 * Code component for syntax-highlighted code blocks.
 * Wraps content in markdown code fences and delegates to the unified markdown pipeline.
 *
 * @example
 * ```tsx
 * import { Code } from "@tabirun/pages/preact";
 *
 * <Code lang="typescript">
 *   const greeting = "Hello";
 * </Code>
 * ```
 */
export function Code(_props: CodeProps): unknown {
  throw new Error("Not implemented");
}

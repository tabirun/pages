import type { JSX } from "preact";
import { Markdown } from "./markdown.tsx";

/**
 * Props for the Code component.
 */
export interface CodeProps {
  /** Language for syntax highlighting. */
  lang?: string;
  /** Code content. */
  children?: string;
}

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
export function Code({ lang, children = "" }: CodeProps): JSX.Element {
  const fence = lang ? `\`\`\`${lang}` : "```";
  const markdown = `${fence}\n${children}\n\`\`\``;
  return <Markdown>{markdown}</Markdown>;
}

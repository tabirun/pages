import type { JSX } from "preact";
import { useId } from "preact/hooks";
import { escapeHtml } from "../utils/html.ts";

/**
 * Props for the internal Markdown component.
 * @internal
 */
export interface MarkdownProps {
  /** Markdown content to render. */
  children?: string;
}

/**
 * Internal component that renders a `<tabi-markdown>` marker for post-processing.
 *
 * On the server, renders a marker element containing escaped markdown content.
 * The marker is extracted and processed by `processMarkdownMarkers()` after SSR.
 *
 * On the client, preserves the processed HTML content during hydration by reading
 * the existing DOM content before Preact modifies it.
 *
 * @internal Not part of public API
 */
export function Markdown({ children = "" }: MarkdownProps): JSX.Element {
  const isServer = typeof window === "undefined";
  const id = useId();

  if (isServer) {
    const marker = `<tabi-markdown>${escapeHtml(children)}</tabi-markdown>`;
    return (
      <div data-tabi-md={id} dangerouslySetInnerHTML={{ __html: marker }} />
    );
  }

  // Client: query DOM before Preact modifies it, read innerHTML
  // TODO: This queries DOM on every re-render and breaks on unmount/remount.
  // See docs/plans/markdown-hydration-cache.md for planned fix.
  const existingEl = document.querySelector(`[data-tabi-md="${id}"]`);
  const preservedHtml = existingEl?.innerHTML ?? "";

  return (
    <div
      data-tabi-md={id}
      dangerouslySetInnerHTML={{ __html: preservedHtml }}
    />
  );
}

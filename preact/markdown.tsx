import type { JSX } from "preact";
import { useId } from "preact/hooks";
import { useMarkdownConfig } from "./context.tsx";
import { useMarkdownCache } from "./markdown-cache.tsx";
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
 * On the client, reads pre-rendered HTML from the markdown cache context,
 * which was populated from serialized page data during hydration.
 *
 * @internal Not part of public API
 */
export function Markdown({ children = "" }: MarkdownProps): JSX.Element {
  const isServer = typeof window === "undefined";
  const id = useId();
  const cache = useMarkdownCache();
  const { wrapperClassName } = useMarkdownConfig();

  // Server and client have different responsibilities:
  // - Server: Output marker for post-processing (cache doesn't exist yet)
  // - Client: Read from cache (populated from serialized page data)
  //
  // The cache is built AFTER server rendering by processMarkdownMarkers(),
  // so we can't use the cache on the server - it hasn't been created yet.

  if (isServer) {
    const marker = `<tabi-markdown>${escapeHtml(children)}</tabi-markdown>`;
    return (
      <div
        data-tabi-md={id}
        class={wrapperClassName}
        dangerouslySetInnerHTML={{ __html: marker }}
      />
    );
  }

  const preservedHtml = cache?.get(id) ?? "";

  return (
    <div
      data-tabi-md={id}
      class={wrapperClassName}
      dangerouslySetInnerHTML={{ __html: preservedHtml }}
    />
  );
}

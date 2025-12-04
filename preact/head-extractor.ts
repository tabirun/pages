import { unescapeHtml } from "../utils/html.ts";

const HEAD_MARKER_REGEX = /<tabi-head>([\s\S]*?)<\/tabi-head>/g;

/**
 * Result of processing head markers.
 */
export interface ProcessHeadMarkersResult {
  /** HTML with head markers removed. */
  html: string;
  /** Concatenated head content from all markers. */
  head: string;
}

/**
 * Extracts and processes `<tabi-head>` markers from rendered HTML.
 *
 * Head markers are rendered by the `<Head>` component during SSR. This function
 * extracts the content from all markers, removes the marker elements from
 * the body HTML, and returns the concatenated head content for injection into
 * the document's `<head>` section.
 *
 * @param html - The rendered HTML containing head markers.
 * @returns Object with cleaned HTML and extracted head content.
 *
 * @example
 * ```typescript
 * import { processHeadMarkers } from "@tabirun/pages/preact";
 *
 * const rendered = renderToString(<Page />);
 * const { html, head } = processHeadMarkers(rendered);
 *
 * const document = `
 *   <!DOCTYPE html>
 *   <html>
 *     <head>${head}</head>
 *     <body>${html}</body>
 *   </html>
 * `;
 * ```
 */
export function processHeadMarkers(html: string): ProcessHeadMarkersResult {
  const headParts: string[] = [];
  const matches = [...html.matchAll(HEAD_MARKER_REGEX)];

  let result = html;
  for (const match of matches.reverse()) {
    const content = unescapeHtml(match[1]);
    headParts.unshift(content);
    const start = match.index!;
    const end = start + match[0].length;
    result = result.slice(0, start) + result.slice(end);
  }

  return {
    html: result,
    head: headParts.join("\n"),
  };
}

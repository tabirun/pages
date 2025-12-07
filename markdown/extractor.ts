import type { MarkdownCache } from "../preact/markdown-cache.tsx";
import { unescapeHtml } from "../utils/html.ts";
import { renderMarkdown } from "./renderer.ts";

/**
 * Regex to match tabi-markdown markers with data-tabi-md wrapper.
 *
 * Matches: `<div data-tabi-md="id"><tabi-markdown>content</tabi-markdown></div>`
 *
 * Groups:
 * - 1: id (from data-tabi-md attribute)
 * - 2: markdown content
 */
const MARKER_REGEX =
  /<div data-tabi-md="([^"]+)"><tabi-markdown>([\s\S]*?)<\/tabi-markdown><\/div>/g;

/**
 * Result of processing markdown markers.
 */
export interface ProcessMarkdownResult {
  /** HTML with markers replaced by rendered markdown. */
  html: string;
  /** Cache mapping data-tabi-md ids to rendered HTML for hydration. */
  cache: MarkdownCache;
}

/**
 * Processes all `<tabi-markdown>` markers in HTML, rendering their content
 * as markdown with Shiki syntax highlighting.
 *
 * Also builds a cache mapping `data-tabi-md` ids to rendered content for
 * client hydration.
 *
 * Security: Output is not sanitized. Only use with trusted markdown content.
 * See renderMarkdown() for details.
 *
 * @param html - The HTML string containing tabi-markdown markers
 * @returns Object with processed HTML and markdown cache
 * @throws {Error} If highlighter initialization fails
 */
export async function processMarkdownMarkers(
  html: string,
): Promise<ProcessMarkdownResult> {
  const cache: MarkdownCache = new Map();
  const matches = [...html.matchAll(MARKER_REGEX)];

  if (matches.length === 0) {
    return { html, cache };
  }

  let result = html;

  // Process in reverse order to avoid index shifting
  for (const match of matches.reverse()) {
    const id = match[1];
    const raw = unescapeHtml(match[2]);
    const rendered = await renderMarkdown(raw);

    // Add to cache
    cache.set(id, rendered);

    // Replace entire div with new div containing rendered content
    const start = match.index!;
    const end = start + match[0].length;
    result = result.slice(0, start) +
      `<div data-tabi-md="${id}">${rendered}</div>` +
      result.slice(end);
  }

  return { html: result, cache };
}

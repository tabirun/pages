import { unescapeHtml } from "../utils/html.ts";
import { renderMarkdown } from "./renderer.ts";

const MARKER_REGEX = /<tabi-markdown>([\s\S]*?)<\/tabi-markdown>/g;

/**
 * Processes all `<tabi-markdown>` markers in HTML, rendering their content
 * as markdown with Shiki syntax highlighting.
 *
 * Security: Output is not sanitized. Only use with trusted markdown content.
 * See renderMarkdown() for details.
 *
 * @param html - The HTML string containing tabi-markdown markers
 * @returns The HTML with markers replaced by rendered markdown
 * @throws {Error} If highlighter initialization fails
 */
export async function processMarkdownMarkers(html: string): Promise<string> {
  const matches = [...html.matchAll(MARKER_REGEX)];

  if (matches.length === 0) {
    return html;
  }

  // Process in reverse order to avoid index shifting when replacing
  let result = html;
  for (const match of matches.reverse()) {
    const raw = unescapeHtml(match[1]);
    const rendered = await renderMarkdown(raw);
    const start = match.index!;
    const end = start + match[0].length;
    result = result.slice(0, start) + rendered + result.slice(end);
  }

  return result;
}

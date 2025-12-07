import type { LoadedPage } from "../loaders/types.ts";
import type { MarkdownCache } from "../preact/markdown-cache.tsx";
import { escapeHtml } from "../utils/html.ts";

/**
 * Serialized page data for client hydration.
 */
export interface SerializedPageData {
  /** Page frontmatter. */
  frontmatter: LoadedPage["frontmatter"];
  /** Route path. */
  route: string;
  /** Page type discriminator. */
  pageType: "markdown" | "tsx";
  /** Rendered markdown cache for hydration (id -> HTML). */
  markdownCache: Record<string, string>;
  /** Base path prefix for the site. */
  basePath: string;
}

/**
 * Serializes page data into a script tag for client hydration.
 *
 * The data is embedded as JSON in a script tag with type="application/json",
 * which prevents execution while allowing the client to parse it.
 *
 * SECURITY:
 * - The JSON is HTML-escaped to prevent XSS from malicious frontmatter
 *   content (e.g., `</script>` in a string field would break out of the tag).
 * - The markdownCache values contain pre-rendered HTML that will be injected
 *   via `dangerouslySetInnerHTML` during hydration. This HTML comes from
 *   `renderMarkdown()` which allows raw HTML passthrough. Only use with
 *   trusted markdown content.
 *
 * @param page - Loaded page containing frontmatter and type
 * @param route - Route path for the page
 * @param markdownCache - Rendered markdown cache from processMarkdownMarkers
 * @param basePath - Base path prefix for the site
 * @returns Complete script tag string ready for HTML embedding
 *
 * @example
 * ```typescript
 * const script = serializePageData(page, "/blog/post", markdownCache, "/docs");
 * // Returns: <script id="__TABI_DATA__" type="application/json">{"frontmatter":...}</script>
 * ```
 */
export function serializePageData(
  page: LoadedPage,
  route: string,
  markdownCache: MarkdownCache,
  basePath: string = "",
): string {
  const data: SerializedPageData = {
    frontmatter: page.frontmatter,
    route,
    pageType: page.type,
    markdownCache: Object.fromEntries(markdownCache),
    basePath,
  };

  const json = JSON.stringify(data);
  const escaped = escapeHtml(json);

  return `<script id="__TABI_DATA__" type="application/json">${escaped}</script>`;
}

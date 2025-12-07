import type { LoadedPage } from "../loaders/types.ts";
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
}

/**
 * Serializes page data into a script tag for client hydration.
 *
 * The data is embedded as JSON in a script tag with type="application/json",
 * which prevents execution while allowing the client to parse it.
 *
 * SECURITY: The JSON is HTML-escaped to prevent XSS from malicious frontmatter
 * content (e.g., `</script>` in a string field would break out of the tag).
 *
 * @param page - Loaded page containing frontmatter and type
 * @param route - Route path for the page
 * @returns Complete script tag string ready for HTML embedding
 *
 * @example
 * ```typescript
 * const script = serializePageData(page, "/blog/post");
 * // Returns: <script id="__TABI_DATA__" type="application/json">{"frontmatter":...}</script>
 * ```
 */
export function serializePageData(page: LoadedPage, route: string): string {
  const data: SerializedPageData = {
    frontmatter: page.frontmatter,
    route,
    pageType: page.type,
  };

  const json = JSON.stringify(data);
  const escaped = escapeHtml(json);

  return `<script id="__TABI_DATA__" type="application/json">${escaped}</script>`;
}

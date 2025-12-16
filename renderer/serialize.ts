import type { LoadedPage } from "../loaders/types.ts";
import type { MarkdownCache } from "../preact/markdown-cache.tsx";

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
  /** CSS class name(s) for markdown wrapper divs. */
  markdownClassName?: string;
}

/**
 * Escapes JSON for safe embedding in a script tag.
 *
 * Script tags don't parse HTML entities, so we only need to prevent
 * the JSON from breaking out of the script tag by escaping:
 * - `</script>` sequences (replaced with `<\/script>`)
 * - `<!--` sequences (could start HTML comments in some contexts)
 *
 * @param json - The JSON string to escape
 * @returns JSON safe for embedding in a script tag
 */
function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

/**
 * Options for serializing page data.
 */
export interface SerializePageDataOptions {
  /** Loaded page containing frontmatter and type. */
  page: LoadedPage;
  /** Route path for the page. */
  route: string;
  /** Rendered markdown cache from processMarkdownMarkers. */
  markdownCache: MarkdownCache;
  /** Base path prefix for the site. */
  basePath?: string;
  /** CSS class name(s) for markdown wrapper divs. */
  markdownClassName?: string;
}

/**
 * Serializes page data into a script tag for client hydration.
 *
 * The data is embedded as JSON in a script tag with type="application/json",
 * which prevents execution while allowing the client to parse it.
 *
 * SECURITY:
 * - The JSON uses unicode escapes for `<` and `>` to prevent breaking out
 *   of the script tag (e.g., `</script>` in a string field).
 * - The markdownCache values contain pre-rendered HTML that will be injected
 *   via `dangerouslySetInnerHTML` during hydration. This HTML comes from
 *   `renderMarkdown()` which allows raw HTML passthrough. Only use with
 *   trusted markdown content.
 *
 * @param options - Serialization options
 * @returns Complete script tag string ready for HTML embedding
 *
 * @example
 * ```typescript
 * const script = serializePageData({
 *   page,
 *   route: "/blog/post",
 *   markdownCache,
 *   basePath: "/docs",
 * });
 * // Returns: <script id="__TABI_DATA__" type="application/json">{"frontmatter":...}</script>
 * ```
 */
export function serializePageData(options: SerializePageDataOptions): string {
  const {
    page,
    route,
    markdownCache,
    basePath = "",
    markdownClassName,
  } = options;

  const data: SerializedPageData = {
    frontmatter: page.frontmatter,
    route,
    pageType: page.type,
    markdownCache: Object.fromEntries(markdownCache),
    basePath,
    markdownClassName,
  };

  const json = JSON.stringify(data);
  const escaped = escapeJsonForScript(json);

  return `<script id="__TABI_DATA__" type="application/json">${escaped}</script>`;
}

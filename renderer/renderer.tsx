import { render } from "preact-render-to-string";
import { processMarkdownMarkers } from "../markdown/extractor.ts";
import { processHeadMarkers } from "../preact/head-extractor.ts";
import { composeTree } from "./compose.tsx";
import { DefaultDocument } from "./document.tsx";
import { serializePageData } from "./serialize.ts";
import {
  RenderError,
  type RenderPageOptions,
  type RenderPageResult,
} from "./types.ts";

/**
 * Renders a page to a complete HTML document string.
 *
 * This function orchestrates the full SSR pipeline:
 * 1. Composes the page with its layout chain into a component tree
 * 2. Renders the tree to an HTML string
 * 3. Processes markdown markers (converts to rendered HTML)
 * 4. Extracts head markers (moves to document head)
 * 5. Serializes page data for client hydration
 * 6. Wraps everything in a document component
 *
 * @param options - Rendering options including page, layouts, and bundle path
 * @returns Complete HTML document with DOCTYPE
 * @throws {RenderError} If rendering fails
 *
 * @example
 * ```typescript
 * const result = await renderPage({
 *   page: loadedPage,
 *   layouts: [rootLayout, blogLayout],
 *   clientBundlePath: "/_tabi/blog/post.js",
 *   route: "/blog/post",
 * });
 * // result.html contains the complete HTML document
 * ```
 */
export async function renderPage(
  options: RenderPageOptions,
): Promise<RenderPageResult> {
  const { page, layouts, clientBundlePath, route, document, basePath = "" } =
    options;

  try {
    // 1. Compose page with layouts into a component tree
    const Tree = composeTree(page, layouts, basePath);

    // 2. Render the tree to an HTML string
    const rawHtml = render(<Tree />);

    // 3. Process markdown markers (async - renders markdown to HTML, builds cache)
    const { html: bodyAfterMarkdown, cache: markdownCache } =
      await processMarkdownMarkers(rawHtml);

    // 4. Extract head markers and get clean body
    const { head: headContent, html: bodyWithoutHead } = processHeadMarkers(
      bodyAfterMarkdown,
    );

    // 5. Serialize page data for client hydration
    const dataScript = serializePageData(page, route, markdownCache, basePath);
    const bundleScript =
      `<script type="module" src="${clientBundlePath}"></script>`;

    // 6. Assemble body content with hydration root and scripts
    const bodyContent = (
      <>
        <div
          id="__tabi__"
          dangerouslySetInnerHTML={{ __html: bodyWithoutHead }}
        />
        <div dangerouslySetInnerHTML={{ __html: dataScript }} />
        <div dangerouslySetInnerHTML={{ __html: bundleScript }} />
      </>
    );

    // 7. Render the document shell (head content injected via string replacement)
    const Document = document ?? DefaultDocument;
    const documentHtml = render(
      <Document head={null}>{bodyContent}</Document>,
    );

    // 8. Inject head content before </head> (string manipulation for raw HTML)
    const headCloseIndex = documentHtml.indexOf("</head>");
    const finalHtml = headCloseIndex >= 0
      ? documentHtml.slice(0, headCloseIndex) +
        headContent +
        documentHtml.slice(headCloseIndex)
      : documentHtml;

    return { html: `<!DOCTYPE html>${finalHtml}` };
  } catch (error) {
    // deno-coverage-ignore-start -- JS errors are always Error instances, String() fallback is defensive
    throw new RenderError(
      `Failed to render page: ${
        error instanceof Error ? error.message : String(error)
      }`,
      route,
      { cause: error },
    );
    // deno-coverage-ignore-stop
  }
}

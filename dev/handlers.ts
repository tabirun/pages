/**
 * Request handlers for the dev server.
 *
 * Provides handlers for page requests, 404 responses, and error responses.
 * Each handler returns HTML with the hot reload script injected.
 *
 * @module
 */

import { dirname, fromFileUrl, join } from "@std/path";
import type { LayoutEntry, PageEntry } from "../scanner/types.ts";
import { processMarkdownMarkers } from "../markdown/extractor.ts";
import { processHeadMarkers } from "../preact/head-extractor.ts";
import { bundleSSR } from "./ssr-bundler.ts";
import { renderErrorOverlay } from "./error-overlay.ts";
import { generateHotReloadScript } from "./client-script.ts";
import type { DevServerState } from "./types.ts";

/** Path to framework's default pages directory. */
const DEFAULTS_DIR = join(
  dirname(fromFileUrl(import.meta.url)),
  "../build/defaults",
);

/**
 * Result of handling a page request.
 */
export interface PageRequestResult {
  /** Complete HTML document with hot reload script. */
  html: string;
  /** HTTP status code. */
  status: number;
}

/**
 * Handles a page request in development mode.
 *
 * This function orchestrates the dev rendering pipeline:
 * 1. Finds the page in the manifest
 * 2. Bundles and executes SSR via data URL import
 * 3. Processes markdown markers (renders markdown, builds cache)
 * 4. Processes head markers (moves to document head)
 * 5. Injects the hot reload script
 * 6. Returns complete HTML
 *
 * If any step fails, returns an error overlay HTML instead.
 *
 * @param route - The request route (e.g., "/about")
 * @param state - Dev server state
 * @returns HTML and status code
 */
export async function handlePageRequest(
  route: string,
  state: DevServerState,
): Promise<PageRequestResult> {
  const { manifest, basePath, rootDir } = state;

  if (!manifest) {
    return {
      html: renderErrorOverlay({
        message: "Page manifest not available",
        stack: "The server is still initializing. Try refreshing.",
        basePath,
      }),
      status: 503,
    };
  }

  // Find the page
  const page = manifest.pages.find((p) => p.route === route);
  if (!page) {
    return handleNotFound(state);
  }

  try {
    // Get layouts for this page
    const layouts = getLayoutsForPage(page, manifest.layouts);

    // Bundle and execute SSR
    const ssrResult = await bundleSSR({
      page,
      layouts,
      projectRoot: rootDir,
      basePath,
    });

    // Process markdown markers
    const { html: htmlAfterMarkdown, cache: markdownCache } =
      await processMarkdownMarkers(ssrResult.html);

    // Process head markers
    const { head: headContent, html: bodyHtml } = processHeadMarkers(
      htmlAfterMarkdown,
    );

    // Build the full HTML document
    const html = buildDevDocument({
      bodyHtml,
      headContent,
      frontmatter: ssrResult.frontmatter,
      pageType: ssrResult.pageType,
      markdownCache,
      route,
      basePath,
    });

    return { html, status: 200 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Send error to connected clients
    state.hotReload.sendError(message, stack);

    return {
      html: renderErrorOverlay({ message, stack, basePath }),
      status: 500,
    };
  }
}

/**
 * Handles a 404 not found response.
 *
 * Uses the custom _not-found.tsx from the manifest if available,
 * otherwise falls back to the framework's default not-found page.
 * The page is rendered through the standard SSR pipeline with
 * the root layout chain applied.
 *
 * @param state - Dev server state
 * @returns HTML and 404 status code
 */
export async function handleNotFound(
  state: DevServerState,
): Promise<PageRequestResult> {
  const { manifest, basePath, rootDir } = state;

  // If manifest not available, return simple error overlay
  if (!manifest) {
    return {
      html: renderErrorOverlay({
        message: "Page manifest not available",
        stack: "The server is still initializing. Try refreshing.",
        basePath,
      }),
      status: 503,
    };
  }

  try {
    // Get the not-found page path (custom or default)
    const notFoundPath = manifest.systemFiles.notFound ??
      join(DEFAULTS_DIR, "_not-found.tsx");

    // Create a synthetic page entry for the not-found page
    const notFoundPage: PageEntry = {
      filePath: notFoundPath,
      route: "/_not-found",
      type: "tsx",
      layoutChain: getRootLayoutChain(manifest.layouts, rootDir),
    };

    // Get layouts for not-found page (root layouts only)
    const layouts = getLayoutsForPage(notFoundPage, manifest.layouts);

    // Bundle and execute SSR
    const ssrResult = await bundleSSR({
      page: notFoundPage,
      layouts,
      projectRoot: rootDir,
      basePath,
    });

    // Process markdown markers (unlikely but possible if layout uses markdown)
    const { html: htmlAfterMarkdown, cache: markdownCache } =
      await processMarkdownMarkers(ssrResult.html);

    // Process head markers
    const { head: headContent, html: bodyHtml } = processHeadMarkers(
      htmlAfterMarkdown,
    );

    // Build the full HTML document
    const html = buildDevDocument({
      bodyHtml,
      headContent,
      frontmatter: ssrResult.frontmatter,
      pageType: ssrResult.pageType,
      markdownCache,
      route: "/_not-found",
      basePath,
    });

    return { html, status: 404 };
  } catch (error) {
    // If not-found page fails to render, fall back to error overlay
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    state.hotReload.sendError(message, stack);

    return {
      html: renderErrorOverlay({
        message: `Failed to render not-found page: ${message}`,
        stack,
        basePath,
      }),
      status: 500,
    };
  }
}

/**
 * Handles an error response.
 *
 * Returns an error overlay HTML page with stack trace and hot reload
 * for automatic recovery. This is used for build/SSR errors, not
 * application runtime errors.
 *
 * @param error - The error that occurred
 * @param basePath - Base path for hot reload script
 * @returns HTML and 500 status code
 */
export function handleError(
  error: Error,
  basePath: string,
): PageRequestResult {
  return {
    html: renderErrorOverlay({
      message: error.message,
      stack: error.stack,
      basePath,
    }),
    status: 500,
  };
}

/**
 * Gets layout entries for a page in correct order (root to innermost).
 */
function getLayoutsForPage(
  page: PageEntry,
  layouts: LayoutEntry[],
): LayoutEntry[] {
  // page.layoutChain contains file paths in order from root to innermost
  return page.layoutChain
    .map((layoutPath) => layouts.find((l) => l.filePath === layoutPath))
    .filter((l): l is LayoutEntry => l !== undefined);
}

/**
 * Gets the root layout chain (layouts at the pages directory root level).
 * Used for system pages like _not-found that should use root layouts.
 */
function getRootLayoutChain(
  layouts: LayoutEntry[],
  rootDir: string,
): string[] {
  // Find root layout (if any) - layout whose directory is the pages root
  const pagesDir = join(rootDir, "pages");
  const rootLayout = layouts.find((l) => l.directory === pagesDir);
  return rootLayout ? [rootLayout.filePath] : [];
}

/**
 * Options for building the dev document.
 */
interface BuildDevDocumentOptions {
  /** Body HTML content (the rendered page). */
  bodyHtml: string;
  /** Head content extracted from Head components. */
  headContent: string;
  /** Page frontmatter. */
  frontmatter: Record<string, unknown>;
  /** Page type: "tsx" or "markdown". */
  pageType: "tsx" | "markdown";
  /** Markdown cache for hydration. */
  markdownCache: Map<string, string>;
  /** Page route. */
  route: string;
  /** Base path prefix. */
  basePath: string;
}

/**
 * Builds the full HTML document for dev mode.
 *
 * This is a simplified version of the production document builder.
 * In dev mode, we don't bundle the client (for speed) and don't
 * use content hashing.
 */
function buildDevDocument(options: BuildDevDocumentOptions): string {
  const {
    bodyHtml,
    headContent,
    frontmatter,
    pageType,
    markdownCache,
    route,
    basePath,
  } = options;

  const hotReloadScript = generateHotReloadScript({ basePath });

  // Serialize page data for hydration
  const pageData = {
    frontmatter,
    route,
    pageType,
    markdownCache: Object.fromEntries(markdownCache),
    basePath,
  };
  const pageDataJson = JSON.stringify(pageData)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  // Build the HTML document
  // Note: Client bundle is NOT included in dev mode for now
  // That will be handled in the server registration (Commit 7)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${headContent}
</head>
<body>
  <div id="__tabi__">${bodyHtml}</div>
  <script id="__TABI_DATA__" type="application/json">${pageDataJson}</script>
  <script>${hotReloadScript}</script>
</body>
</html>`;
}

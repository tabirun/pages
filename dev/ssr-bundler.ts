/**
 * SSR bundler for development mode.
 *
 * Bundles page entry code with esbuild and imports via data URL to bypass
 * Deno's module cache. This enables hot reloading of user code changes
 * without restarting the server.
 *
 * See ADR-004 for the rationale behind this approach.
 *
 * @module
 */

import * as esbuild from "esbuild";
import { dirname, join } from "@std/path";
import type { LayoutEntry, PageEntry } from "../scanner/types.ts";
import { generateSSREntry } from "./ssr-entry.ts";

/**
 * Result of bundling and executing SSR entry code.
 */
export interface SSRBundleResult {
  /** Rendered HTML string. */
  html: string;
  /** Page frontmatter object. */
  frontmatter: Record<string, unknown>;
  /** Page type: "tsx" or "markdown". */
  pageType: "tsx" | "markdown";
}

/**
 * Options for bundling SSR entry code.
 */
export interface SSRBundleOptions {
  /** Page entry to render. */
  page: PageEntry;
  /** Layout chain from root to innermost. */
  layouts: LayoutEntry[];
  /** Project root for resolving imports. */
  projectRoot: string;
  /** Base path prefix for the site (e.g., "/docs"). */
  basePath?: string;
}

/**
 * Error thrown when SSR bundling fails.
 */
export class SSRBundleError extends Error {
  override name = "SSRBundleError";

  constructor(
    message: string,
    public readonly route: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Bundles and executes SSR entry code for a page.
 *
 * This function:
 * 1. Generates SSR entry code using generateSSREntry()
 * 2. Bundles it with esbuild (in-memory, no disk I/O)
 * 3. Imports the bundle via data URL (bypasses Deno cache)
 * 4. Returns the rendered HTML and metadata
 *
 * The data URL import is critical for hot reloading - Deno caches
 * dynamic imports, but data URLs are always fresh.
 *
 * @param options - Bundle options
 * @returns Rendered HTML and page metadata
 * @throws {SSRBundleError} If bundling or rendering fails
 *
 * @example
 * ```typescript
 * const result = await bundleSSR({
 *   page: { filePath: "/project/pages/about.tsx", route: "/about", type: "tsx", layoutChain: [] },
 *   layouts: [{ filePath: "/project/pages/_layout.tsx", directory: "/project/pages" }],
 *   projectRoot: "/project",
 *   basePath: "/docs",
 * });
 * // result.html contains the rendered HTML
 * // result.frontmatter contains the page's frontmatter
 * // result.pageType is "tsx" or "markdown"
 * ```
 */
export async function bundleSSR(
  options: SSRBundleOptions,
): Promise<SSRBundleResult> {
  const { page, layouts, projectRoot, basePath = "" } = options;

  // Resolve preact directory path for entry generation
  const preactDir = join(
    dirname(new URL(import.meta.url).pathname),
    "../preact",
  );

  // Generate entry code
  const entryCode = generateSSREntry({
    page,
    layouts,
    preactDir,
    basePath,
  });

  try {
    // Bundle with esbuild
    const result = await esbuild.build({
      stdin: {
        contents: entryCode,
        loader: "tsx",
        resolveDir: projectRoot,
      },
      bundle: true,
      format: "esm",
      target: "es2022",
      jsx: "automatic",
      jsxImportSource: "preact",
      platform: "node", // Closest to Deno; supports server-side APIs
      sourcemap: "inline", // Must be inline; can't reference external .map from data URL
      minify: false,
      treeShaking: true,
      write: false,
      external: [
        // Framework modules - resolved at runtime
        "@tabirun/*",
        // Preact - resolved at runtime
        "preact",
        "preact/*",
        "preact-render-to-string",
        // Common npm dependencies - resolved at runtime
        "zod",
      ],
    });

    if (!result.outputFiles?.[0]) {
      throw new SSRBundleError("No JavaScript output produced", page.route);
    }

    const bundledCode = result.outputFiles[0].text;

    // Import via data URL to bypass Deno's module cache
    // This is the key to hot reloading - each import is fresh
    const dataUrl = `data:text/javascript;base64,${btoa(bundledCode)}`;
    const module = await import(dataUrl);

    // Extract exports from the module
    const html = module.html as string;
    const frontmatter = module.frontmatter as Record<string, unknown>;
    const pageType = module.pageType as "tsx" | "markdown";

    if (typeof html !== "string") {
      throw new SSRBundleError(
        "SSR module did not export 'html' as a string",
        page.route,
      );
    }

    return { html, frontmatter, pageType };
  } catch (error) {
    if (error instanceof SSRBundleError) {
      throw error;
    }
    throw new SSRBundleError(
      `Failed to bundle SSR: ${
        error instanceof Error ? error.message : String(error)
      }`,
      page.route,
      { cause: error instanceof Error ? error : undefined },
    );
  }
}

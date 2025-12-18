/**
 * SSR bundling for dev server.
 *
 * Bundles page and layout components using esbuild, then imports
 * the bundle to get fresh components (bypassing Deno's module cache).
 *
 * @module
 */

import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import type {
  LoadedLayout,
  LoadedPage,
  LoadedTsxPage,
} from "../loaders/types.ts";
import type { PageEntry } from "../scanner/types.ts";
import { generateSSREntry } from "./ssr-entry.ts";
import { loadMarkdownPage } from "../loaders/markdown-loader.ts";
import { BundleError } from "./types.ts";

/**
 * Options for SSR bundling.
 */
export interface SSRBundleOptions {
  /** Page entry from manifest. */
  pageEntry: PageEntry;
  /** Output directory for temp bundles. */
  outDir: string;
  /** Project root for import resolution. */
  projectRoot: string;
}

/**
 * Result of SSR bundling.
 */
export interface SSRBundleResult {
  /** Loaded page (TSX or markdown). */
  page: LoadedPage;
  /** Loaded layouts. */
  layouts: LoadedLayout[];
}

/** Counter for unique temp file names. */
let bundleCounter = 0;

/**
 * Bundle page and layouts for SSR.
 *
 * For TSX pages, bundles both page and layouts.
 * For markdown pages, loads markdown directly (no cache issues)
 * and only bundles layouts.
 *
 * The bundle is written to a unique temp file and imported,
 * bypassing Deno's module cache to get fresh components.
 *
 * @param options - Bundle options
 * @returns Loaded page and layouts ready for renderPage
 * @throws {BundleError} If bundling fails
 */
export async function bundleSSR(
  options: SSRBundleOptions,
): Promise<SSRBundleResult> {
  const { pageEntry, outDir, projectRoot } = options;
  const isTsx = pageEntry.type === "tsx";

  // For markdown pages, load directly (readTextFile doesn't cache)
  let markdownPage: LoadedPage | undefined;
  if (!isTsx) {
    markdownPage = await loadMarkdownPage(pageEntry.filePath);
  }

  // If no layouts and markdown page, skip bundling entirely
  if (!isTsx && pageEntry.layoutChain.length === 0) {
    return {
      page: markdownPage!,
      layouts: [],
    };
  }

  // Generate SSR entry code
  const entryCode = generateSSREntry({
    pageEntry,
    isTsx,
  });

  // Ensure output directory exists
  const ssrDir = join(outDir, "__ssr");
  await ensureDir(ssrDir);

  // Write entry to temp file
  const entryPath = join(
    ssrDir,
    `__entry_${Date.now()}_${bundleCounter++}.tsx`,
  );
  await Deno.writeTextFile(entryPath, entryCode);

  // Check if project has deno.json config
  const configPath = join(projectRoot, "deno.json");
  let hasConfig = false;
  try {
    const stat = await Deno.stat(configPath);
    hasConfig = stat.isFile;
  } catch {
    // Config doesn't exist
  }

  // Create esbuild context for this build
  // Using context + dispose gives us explicit lifecycle control
  // and avoids issues with long-lived child processes
  const ctx = await esbuild.context({
    entryPoints: [entryPath],
    bundle: true,
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    jsxImportSource: "preact",
    minify: false,
    sourcemap: false,
    write: false,
    plugins: [...denoPlugins(hasConfig ? { configPath } : {})],
    // Mark preact as external - we want the same instance as parent
    external: ["preact", "preact/*", "preact-render-to-string"],
  });

  try {
    // Build with the context
    const result = await ctx.rebuild();

    if (!result.outputFiles?.[0]) {
      throw new BundleError(
        "No output produced from SSR bundle",
        pageEntry.route,
      );
    }

    const bundleCode = result.outputFiles[0].text;

    // Write bundle to unique temp file (so import isn't cached)
    const bundlePath = join(
      ssrDir,
      `__bundle_${Date.now()}_${bundleCounter++}.mjs`,
    );
    await Deno.writeTextFile(bundlePath, bundleCode);

    // Import the bundle
    const bundleUrl = `file://${bundlePath}`;
    const module = await import(bundleUrl) as SSRModule;

    // Clean up temp files (fire and forget)
    Deno.remove(entryPath).catch(() => {});
    Deno.remove(bundlePath).catch(() => {});

    // For TSX pages, get page from bundle
    if (isTsx) {
      if (!module.page) {
        throw new BundleError(
          "SSR bundle missing page export",
          pageEntry.route,
        );
      }
      return {
        page: module.page as LoadedTsxPage,
        layouts: module.layouts ?? [],
      };
    }

    // For markdown pages, use directly loaded page
    return {
      page: markdownPage!,
      layouts: module.layouts ?? [],
    };
  } catch (error) {
    // Clean up entry file on error
    Deno.remove(entryPath).catch(() => {});

    if (error instanceof BundleError) {
      throw error;
    }
    throw new BundleError(
      `SSR bundling failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      pageEntry.route,
      { cause: error instanceof Error ? error : undefined },
    );
  } finally {
    // Always dispose the context to clean up the esbuild child process
    await ctx.dispose();
  }
}

/**
 * Shape of the SSR bundle module exports.
 */
interface SSRModule {
  page?: LoadedTsxPage;
  layouts?: LoadedLayout[];
}

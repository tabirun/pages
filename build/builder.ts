import { dirname, isAbsolute, join, resolve } from "@std/path";
import { emptyDir, ensureDir, walk } from "@std/fs";
import type { ComponentType } from "preact";
import { bundleClient, stopEsbuild } from "../bundler/client.ts";
import { loadDocument } from "../loaders/html-loader.ts";
import { loadLayout, loadLayoutChain } from "../loaders/layout-loader.ts";
import { loadPage } from "../loaders/loader.ts";
import type { LoadedLayout, LoadedPage } from "../loaders/types.ts";
import { renderPage } from "../renderer/renderer.tsx";
import type { DocumentProps } from "../renderer/types.ts";
import { scanPages } from "../scanner/scanner.ts";
import type { PageEntry } from "../scanner/types.ts";
import { copyAssetsWithHashes, createAssetMap } from "./assets.ts";
import { rewriteCssUrls } from "./css-rewriter.ts";
import {
  createDefaultErrorPage,
  createDefaultNotFoundPage,
} from "./defaults.tsx";
import { rewriteAssetUrls } from "./html-rewriter.ts";
import {
  BuildError,
  type BuildPageResult,
  type BuildSitemapResult,
  type BuildSiteOptions,
  type BuildSiteResult,
} from "./types.ts";
import { compileCSS, injectStylesheet } from "../css/compiler.ts";
import { generateSitemap } from "./sitemap.ts";

/** Subdirectory for client bundles within output directory. */
const BUNDLE_DIR = "__tabi";

/**
 * Build a static site from pages directory.
 *
 * Scans for pages, renders each to HTML, bundles client JS,
 * and writes everything to the output directory.
 *
 * @param options - Build configuration
 * @returns Build results including all pages built
 * @throws {BuildError} If build fails
 *
 * @example
 * ```typescript
 * const result = await buildSite({
 *   pagesDir: "/project/pages",
 *   outDir: "/project/dist",
 * });
 * console.log(`Built ${result.pages.length} pages in ${result.durationMs}ms`);
 * ```
 */
export async function buildSite(
  options: BuildSiteOptions,
): Promise<BuildSiteResult> {
  const startTime = performance.now();
  const {
    pagesDir,
    outDir,
    document,
    sitemap,
    basePath = "",
    markdownClassName,
    cssEntry,
  } = options;

  // Validate paths
  validatePaths(options);

  try {
    // Clean and prepare output directory
    await emptyDir(outDir);
    await ensureDir(join(outDir, BUNDLE_DIR));

    // Scan for pages
    const manifest = await scanPages({
      rootDir: dirname(pagesDir),
      pagesDir: "pages",
    });

    // Build layout cache for efficient lookup
    const layoutCache = new Map<string, LoadedLayout>();

    // Find root layout if it exists (for system pages)
    const rootLayoutEntry = manifest.layouts.find((l) => l.directory === "");
    let rootLayout: LoadedLayout | undefined;
    if (rootLayoutEntry) {
      rootLayout = await loadLayout(rootLayoutEntry.filePath, "");
      layoutCache.set(rootLayoutEntry.filePath, rootLayout);
    }

    // Load custom document template if _html.tsx exists
    // Programmatic document option takes precedence over file-based _html.tsx
    let documentComponent = document;
    if (!documentComponent && manifest.systemFiles.html) {
      const loadedDoc = await loadDocument(manifest.systemFiles.html);
      documentComponent = loadedDoc.component;
    }

    // Build each page
    const results: BuildPageResult[] = [];

    for (const pageEntry of manifest.pages) {
      const result = await buildPage({
        pageEntry,
        pagesDir,
        outDir,
        layoutCache,
        document: documentComponent,
        basePath,
        markdownClassName,
      });
      results.push(result);
    }

    // Build _not-found page (custom or default)
    const notFoundResult = await buildSystemPage({
      customFilePath: manifest.systemFiles.notFound,
      defaultPage: createDefaultNotFoundPage(),
      outputFileName: "_not-found.html",
      route: "/_not-found",
      rootLayout,
      pagesDir,
      outDir,
      document: documentComponent,
      basePath,
      markdownClassName,
    });
    results.push(notFoundResult);

    // Build _error page (custom or default)
    const errorResult = await buildSystemPage({
      customFilePath: manifest.systemFiles.error,
      defaultPage: createDefaultErrorPage(),
      outputFileName: "_error.html",
      route: "/_error",
      rootLayout,
      pagesDir,
      outDir,
      document: documentComponent,
      basePath,
      markdownClassName,
    });
    results.push(errorResult);

    // Copy public assets with content hashes for cache busting
    const hashedAssets = await copyAssetsWithHashes({
      assets: manifest.publicAssets,
      outDir,
    });
    const assetMap = createAssetMap(hashedAssets, basePath);

    // Compile CSS if postcss config and entry file exist
    let cssResult: { css: string; publicPath: string } | undefined;
    const projectRoot = dirname(pagesDir);
    if (manifest.systemFiles.postcssConfig && cssEntry) {
      const entryPath = join(projectRoot, cssEntry);
      const projectConfig = join(projectRoot, "deno.json");
      const cssCompileResult = await compileCSS({
        entryPath,
        configPath: manifest.systemFiles.postcssConfig,
        outDir,
        basePath,
        projectConfig,
      });
      if (cssCompileResult.css) {
        cssResult = {
          css: cssCompileResult.css,
          publicPath: cssCompileResult.publicPath,
        };
      }
    }

    // Post-process HTML files: rewrite asset URLs and inject CSS
    for (const page of results) {
      let html = await Deno.readTextFile(page.htmlPath);
      html = rewriteAssetUrls(html, assetMap);
      if (cssResult) {
        html = injectStylesheet(html, cssResult.publicPath);
      }
      await Deno.writeTextFile(page.htmlPath, html);
    }

    // Post-process CSS files: rewrite url() references
    for await (const entry of walk(outDir, { exts: [".css"] })) {
      if (entry.isFile) {
        const css = await Deno.readTextFile(entry.path);
        const rewritten = rewriteCssUrls(css, assetMap);
        if (rewritten !== css) {
          await Deno.writeTextFile(entry.path, rewritten);
        }
      }
    }

    // Generate sitemap if configured
    let sitemapResult: BuildSitemapResult | undefined;
    if (sitemap) {
      const routes = results.map((page) => page.route);
      sitemapResult = await generateSitemap({
        routes,
        config: sitemap,
        outDir,
      });
    }

    return {
      pages: results,
      assets: hashedAssets,
      css: cssResult ? { publicPath: cssResult.publicPath } : undefined,
      sitemap: sitemapResult,
      durationMs: Math.round(performance.now() - startTime),
    };
    // deno-coverage-ignore-start -- error handling: exceptions from underlying modules are already tested there
  } catch (error) {
    if (error instanceof BuildError) {
      throw error;
    }
    throw new BuildError(
      `Build failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      { cause: error instanceof Error ? error : undefined },
    );
  } finally {
    await stopEsbuild();
  }
  // deno-coverage-ignore-stop
}

interface BuildPageOptions {
  pageEntry: PageEntry;
  pagesDir: string;
  outDir: string;
  layoutCache: Map<string, LoadedLayout>;
  document?: ComponentType<DocumentProps>;
  basePath: string;
  markdownClassName?: string;
}

/**
 * Build a single page.
 */
async function buildPage(options: BuildPageOptions): Promise<BuildPageResult> {
  const {
    pageEntry,
    pagesDir,
    outDir,
    layoutCache,
    document,
    basePath,
    markdownClassName,
  } = options;
  const { route, filePath, layoutChain } = pageEntry;

  try {
    // Load page
    const page = await loadPage(filePath);

    // Load layouts (with caching)
    const layouts = await loadLayoutChain(layoutChain, layoutCache);

    // Bundle client JS
    const bundleResult = await bundleClient({
      page,
      layouts,
      route,
      outDir: join(outDir, BUNDLE_DIR),
      mode: "production",
      projectRoot: dirname(pagesDir),
      basePath,
    });

    // Render to HTML
    const { html } = await renderPage({
      page,
      layouts,
      clientBundlePath: bundleResult.publicPath,
      route,
      document,
      basePath,
      markdownClassName,
    });

    // Write HTML file
    const htmlPath = routeToHtmlPath(route, outDir);
    await ensureDir(dirname(htmlPath));
    await Deno.writeTextFile(htmlPath, html);

    return {
      route,
      htmlPath,
      bundlePath: bundleResult.outputPath,
      bundlePublicPath: bundleResult.publicPath,
    };
    // deno-coverage-ignore-start -- error handling: exceptions from underlying modules are already tested there
  } catch (error) {
    if (error instanceof BuildError) {
      throw error;
    }
    throw new BuildError(
      `Failed to build page ${route}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      route,
      { cause: error instanceof Error ? error : undefined },
    );
  }
  // deno-coverage-ignore-stop
}

interface BuildSystemPageOptions {
  /** Path to custom system page, or null to use default. */
  customFilePath: string | null;
  /** Default page to use if no custom page provided. */
  defaultPage: LoadedPage;
  /** Output filename (e.g., "_not-found.html"). */
  outputFileName: string;
  /** Route for the page. */
  route: string;
  /** Root layout to apply, if any. */
  rootLayout?: LoadedLayout;
  pagesDir: string;
  outDir: string;
  document?: ComponentType<DocumentProps>;
  basePath: string;
  markdownClassName?: string;
}

/**
 * Build a system page (_not-found or _error).
 * Uses custom page if provided, otherwise uses default.
 * Applies root layout if available.
 */
async function buildSystemPage(
  options: BuildSystemPageOptions,
): Promise<BuildPageResult> {
  const {
    customFilePath,
    defaultPage,
    outputFileName,
    route,
    rootLayout,
    pagesDir,
    outDir,
    document,
    basePath,
    markdownClassName,
  } = options;

  try {
    // Load custom page or use default
    const page = customFilePath ? await loadPage(customFilePath) : defaultPage;

    // Apply root layout if available
    const layouts: LoadedLayout[] = rootLayout ? [rootLayout] : [];

    // Bundle client JS
    const bundleResult = await bundleClient({
      page,
      layouts,
      route,
      outDir: join(outDir, BUNDLE_DIR),
      mode: "production",
      projectRoot: dirname(pagesDir),
      basePath,
    });

    // Render to HTML
    const { html } = await renderPage({
      page,
      layouts,
      clientBundlePath: bundleResult.publicPath,
      route,
      document,
      basePath,
      markdownClassName,
    });

    // Write HTML file
    const htmlPath = join(outDir, outputFileName);
    await Deno.writeTextFile(htmlPath, html);

    return {
      route,
      htmlPath,
      bundlePath: bundleResult.outputPath,
      bundlePublicPath: bundleResult.publicPath,
    };
    // deno-coverage-ignore-start -- error handling: exceptions from underlying modules are already tested there
  } catch (error) {
    if (error instanceof BuildError) {
      throw error;
    }
    throw new BuildError(
      `Failed to build ${route} page: ${
        error instanceof Error ? error.message : String(error)
      }`,
      route,
      { cause: error instanceof Error ? error : undefined },
    );
  }
  // deno-coverage-ignore-stop
}

/**
 * Convert a route to an HTML output path.
 * "/" -> "index.html"
 * "/about" -> "about.html"
 * "/blog/post" -> "blog/post.html"
 */
function routeToHtmlPath(route: string, outDir: string): string {
  // deno-coverage-ignore-start -- security check: routes come from filesystem scanning, can't contain traversal in practice
  // Validate route doesn't contain path traversal
  if (route.includes("..")) {
    throw new BuildError(`Invalid route: ${route} contains path traversal`);
  }
  // deno-coverage-ignore-stop

  if (route === "/") {
    return join(outDir, "index.html");
  }

  const htmlPath = resolve(join(outDir, `${route.slice(1)}.html`));
  const resolvedOutDir = resolve(outDir);

  // deno-coverage-ignore-start -- security check: routes come from filesystem scanning, can't escape outDir in practice
  // Ensure path is within outDir
  if (!htmlPath.startsWith(resolvedOutDir + "/")) {
    throw new BuildError(`Route ${route} escapes output directory`);
  }
  // deno-coverage-ignore-stop

  return htmlPath;
}

/**
 * Validate build options.
 */
function validatePaths(options: BuildSiteOptions): void {
  const { pagesDir, outDir } = options;

  if (!isAbsolute(pagesDir)) {
    throw new BuildError("pagesDir must be an absolute path");
  }
  if (!isAbsolute(outDir)) {
    throw new BuildError("outDir must be an absolute path");
  }

  // Prevent path traversal in paths
  if (pagesDir.includes("..") || outDir.includes("..")) {
    throw new BuildError("Paths must not contain '..' sequences");
  }
}

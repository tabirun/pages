/**
 * Subprocess entry point for building a single page.
 *
 * This script runs in a fresh Deno process to escape module caching.
 * It takes command line arguments, builds the requested page, and
 * outputs JSON to stdout.
 *
 * Usage: deno run -A dev/build-page.ts <pagesDir> <route> <outDir> <basePath> <markdownClassName> [projectConfig]
 *
 * Output (JSON to stdout):
 * Success: { success: true, html: string, bundlePublicPath: string, unoPublicPath?: string }
 * Error: { success: false, error: string, stack?: string }
 */

import { basename, dirname, join } from "@std/path";
import { bundleClient, stopEsbuild } from "../bundler/client.ts";
import { loadDocument } from "../loaders/html-loader.ts";
import { loadLayoutChain } from "../loaders/layout-loader.ts";
import { loadPage } from "../loaders/loader.ts";
import { renderPage } from "../renderer/renderer.tsx";
import { scanPages } from "../scanner/scanner.ts";
import { compileUnoCSS, injectStylesheet } from "../unocss/compiler.ts";

interface BuildResult {
  success: true;
  html: string;
  bundlePublicPath: string;
  unoPublicPath?: string;
}

interface BuildError {
  success: false;
  error: string;
  stack?: string;
}

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length < 5) {
    const error: BuildError = {
      success: false,
      error:
        "Usage: deno run -A dev/build-page.ts <pagesDir> <route> <outDir> <basePath> <markdownClassName> [projectConfig]",
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }

  const [pagesDir, route, outDir, basePath, markdownClassName, projectConfig] =
    args;

  // Validate paths before use
  // Note: All output goes to stdout as JSON for parent process to parse
  if (!pagesDir.startsWith("/")) {
    const error: BuildError = {
      success: false,
      error: "pagesDir must be an absolute path",
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }

  if (!outDir.startsWith("/")) {
    const error: BuildError = {
      success: false,
      error: "outDir must be an absolute path",
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }

  if (route.includes("..")) {
    const error: BuildError = {
      success: false,
      error: "route must not contain path traversal",
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }

  try {
    const result = await buildPage(
      pagesDir,
      route,
      outDir,
      basePath,
      markdownClassName || undefined,
      projectConfig || undefined,
    );
    console.log(JSON.stringify(result));
  } catch (err) {
    const error: BuildError = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  } finally {
    await stopEsbuild();
  }
}

async function buildPage(
  pagesDir: string,
  route: string,
  outDir: string,
  basePath: string,
  markdownClassName?: string,
  projectConfig?: string,
): Promise<BuildResult> {
  // pagesDir is absolute (e.g., /project/pages), derive projectRoot and dir name
  const projectRoot = dirname(pagesDir);
  const pagesDirName = basename(pagesDir);

  // Scan pages to find the requested page
  const manifest = await scanPages({
    rootDir: projectRoot,
    pagesDir: pagesDirName,
  });

  // Find the page entry for this route
  const pageEntry = manifest.pages.find((p) => p.route === route);

  if (!pageEntry) {
    throw new Error(`Page not found for route: ${route}`);
  }

  // Defense-in-depth: ensure page file is within pagesDir
  if (!pageEntry.filePath.startsWith(pagesDir + "/")) {
    throw new Error(`Page file path outside pagesDir: ${pageEntry.filePath}`);
  }

  // Load the page
  const page = await loadPage(pageEntry.filePath);

  // Load layouts
  const layouts = await loadLayoutChain(pageEntry.layoutChain);

  // Load custom document template if _html.tsx exists
  const documentComponent = manifest.systemFiles.html
    ? (await loadDocument(manifest.systemFiles.html)).component
    : undefined;

  // Bundle client JS
  const bundleResult = await bundleClient({
    page,
    layouts,
    route,
    outDir: join(outDir, "__tabi"),
    mode: "development",
    projectRoot,
    basePath,
  });

  // Render to HTML
  const { html: rawHtml } = await renderPage({
    page,
    layouts,
    clientBundlePath: bundleResult.publicPath,
    route,
    document: documentComponent,
    basePath,
    markdownClassName,
  });

  // Compile UnoCSS if config exists
  let html = rawHtml;
  let unoPublicPath: string | undefined;

  if (manifest.systemFiles.unoConfig) {
    const unoResult = await compileUnoCSS({
      configPath: manifest.systemFiles.unoConfig,
      projectRoot,
      outDir,
      basePath,
      projectConfig,
    });

    if (unoResult.css) {
      html = injectStylesheet(html, unoResult.publicPath);
      unoPublicPath = unoResult.publicPath;
    }
  }

  return {
    success: true,
    html,
    bundlePublicPath: bundleResult.publicPath,
    unoPublicPath,
  };
}

// Run main
main();

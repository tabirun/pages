import * as esbuild from "esbuild";
import { dirname, fromFileUrl, join } from "@std/path";
import { ensureDir } from "@std/fs";
import { encodeHex } from "@std/encoding/hex";
import { generateClientEntry } from "./entry.ts";
import {
  type BundleClientOptions,
  type BundleClientResult,
  BundleError,
} from "./types.ts";

/** Whether running from local file system or remote (JSR). */
const IS_LOCAL = new URL(import.meta.url).protocol === "file:";

/**
 * esbuild plugin to handle HTTP/HTTPS imports.
 * Required when framework code is loaded from JSR (remote URLs).
 */
function httpPlugin(): esbuild.Plugin {
  return {
    name: "http",
    setup(build) {
      // Resolve HTTPS URLs
      build.onResolve({ filter: /^https:\/\// }, (args) => ({
        path: args.path,
        namespace: "http-url",
      }));

      // Resolve relative imports from HTTP modules
      build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => {
        const url = new URL(args.path, args.importer);
        return { path: url.href, namespace: "http-url" };
      });

      // Fetch and return HTTP content
      build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
        const response = await fetch(args.path);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${args.path}: ${response.status}`);
        }
        const contents = await response.text();
        const ext = args.path.split(".").pop() ?? "";
        const loader = ext === "tsx"
          ? "tsx"
          : ext === "ts"
          ? "ts"
          : ext === "jsx"
          ? "jsx"
          : "js";
        return { contents, loader };
      });
    },
  };
}

/**
 * Bundle a page for client-side hydration.
 *
 * Generates a client entry file and bundles it with esbuild. The bundle
 * includes the page component (TSX only), layout chain, and Preact runtime.
 *
 * Development mode produces unminified bundles with inline sourcemaps and
 * deterministic filenames. Production mode produces minified bundles with
 * content-hashed filenames for cache busting.
 *
 * @param options - Bundle configuration
 * @returns Bundle output paths and hash
 * @throws {BundleError} If bundling fails
 *
 * @example
 * ```typescript
 * const result = await bundleClient({
 *   page: loadedPage,
 *   layouts: [rootLayout, blogLayout],
 *   route: "/blog/post",
 *   outDir: ".tabi/client",
 *   mode: "development",
 *   projectRoot: "/project",
 * });
 * // result.publicPath = "/__tabi/blog/post.js"
 * ```
 */
export async function bundleClient(
  options: BundleClientOptions,
): Promise<BundleClientResult> {
  const { page, layouts, route, outDir, mode, projectRoot, basePath = "" } =
    options;

  // Validate paths
  validatePaths(options);

  // Resolve preact directory path for entry generation
  // Use file path for local, full HTTPS URL for remote (JSR)
  const preactDir = IS_LOCAL
    ? join(dirname(fromFileUrl(import.meta.url)), "../preact")
    : new URL("../preact/", import.meta.url).href;

  // Generate entry code
  const entryCode = generateClientEntry(page, layouts, preactDir);

  // Determine base filename from route
  const routeFileName = routeToFileName(route);

  // Ensure output directory exists
  const outputDir = dirname(join(outDir, routeFileName));
  await ensureDir(outputDir);

  try {
    const result = await esbuild.build({
      stdin: {
        contents: entryCode,
        loader: "tsx",
        resolveDir: projectRoot,
      },
      bundle: true,
      format: "esm",
      target: "es2020",
      jsx: "automatic",
      jsxImportSource: "preact",
      minify: mode === "production",
      sourcemap: mode === "development" ? "inline" : false,
      write: false,
      plugins: IS_LOCAL ? [] : [httpPlugin()],
    });

    // deno-coverage-ignore-start -- esbuild always produces output for valid builds, defensive check
    if (!result.outputFiles?.[0]) {
      throw new BundleError("No JavaScript output produced", route);
    }
    // deno-coverage-ignore-stop

    const code = result.outputFiles[0].text;

    // Generate output filename with hash for production
    let outputFileName: string;
    let hash: string | undefined;

    if (mode === "production") {
      hash = await generateHash(code);
      outputFileName = `${routeFileName}-${hash}.js`;
    } else {
      outputFileName = `${routeFileName}.js`;
    }

    const outputPath = join(outDir, outputFileName);
    await ensureDir(dirname(outputPath));
    await Deno.writeTextFile(outputPath, code);

    const publicPath = `${basePath}/__tabi/${outputFileName}`;

    return {
      outputPath,
      publicPath,
      ...(hash ? { hash } : {}),
    };
  } catch (error) {
    // deno-coverage-ignore-start -- only BundleError from try block is defensive "no output" check which can't trigger
    if (error instanceof BundleError) {
      throw error;
    }
    // deno-coverage-ignore-stop
    // deno-coverage-ignore-start -- esbuild always throws Error instances, String() fallback is defensive
    throw new BundleError(
      `Failed to bundle client: ${
        error instanceof Error ? error.message : String(error)
      }`,
      route,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }
}

/**
 * Convert a route to an output filename.
 * "/" becomes "index", "/about" becomes "about", "/blog/post" becomes "blog/post"
 */
function routeToFileName(route: string): string {
  if (route === "/") {
    return "index";
  }
  // Remove leading slash
  return route.slice(1);
}

/**
 * Generate a short content hash for cache busting.
 */
async function generateHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hashBuffer)).slice(0, 8).toUpperCase();
}

/**
 * Validate bundle options for security.
 */
function validatePaths(options: BundleClientOptions): void {
  const { outDir, projectRoot, route } = options;

  // Validate absolute paths
  if (!outDir.startsWith("/")) {
    throw new BundleError("outDir must be an absolute path", route);
  }
  if (!projectRoot.startsWith("/")) {
    throw new BundleError("projectRoot must be an absolute path", route);
  }

  // Validate route doesn't contain path traversal
  if (route.includes("..")) {
    throw new BundleError("route must not contain path traversal", route);
  }

  // Validate outDir is within or adjacent to projectRoot
  // (allowing .tabi/ which is at projectRoot level)
  const normalizedOutDir = outDir.replace(/\/+$/, "");
  const normalizedProjectRoot = projectRoot.replace(/\/+$/, "");

  if (
    !normalizedOutDir.startsWith(normalizedProjectRoot) &&
    !normalizedOutDir.startsWith(dirname(normalizedProjectRoot))
  ) {
    throw new BundleError(
      "outDir must be within or adjacent to projectRoot",
      route,
    );
  }
}

/**
 * Stop the esbuild service.
 * Call this when you're done bundling to release resources.
 *
 * @returns Promise that resolves when esbuild is stopped
 */
export function stopEsbuild(): Promise<void> {
  return esbuild.stop();
}

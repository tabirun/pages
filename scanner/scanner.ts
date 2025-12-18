import { dirname, join, resolve } from "@std/path";
import { exists } from "@std/fs";
import { classifyFile } from "./classifier.ts";
import { buildLayoutChain } from "./layouts.ts";
import { filePathToRoute, publicPathToRoute } from "./routes.ts";
import type {
  LayoutEntry,
  PageEntry,
  PageManifest,
  PublicAsset,
  ScanOptions,
  SystemFiles,
} from "./types.ts";
import { walkDirectory } from "./walker.ts";

const DEFAULT_PAGES_DIR = "pages";
const DEFAULT_PUBLIC_DIR = "public";

/**
 * Scans directories for pages, layouts, system files, and assets.
 *
 * @param options - Scan configuration
 * @returns Manifest of discovered files
 * @throws {Error} If rootDir does not exist
 */
export async function scanPages(options: ScanOptions): Promise<PageManifest> {
  const rootDir = resolve(options.rootDir);
  const pagesDir = join(rootDir, options.pagesDir ?? DEFAULT_PAGES_DIR);
  const publicDir = join(rootDir, options.publicDir ?? DEFAULT_PUBLIC_DIR);

  const pages: PageEntry[] = [];
  const layouts: LayoutEntry[] = [];
  const layoutsByDir = new Map<string, string>();
  const systemFiles: SystemFiles = {
    html: null,
    notFound: null,
    error: null,
    postcssConfig: null,
  };
  const publicAssets: PublicAsset[] = [];

  // Check for postcss.config.ts at project root
  const postcssConfigPath = join(rootDir, "postcss.config.ts");
  if (await exists(postcssConfigPath)) {
    systemFiles.postcssConfig = postcssConfigPath;
  }

  // Scan pages directory
  if (await exists(pagesDir)) {
    for await (const entry of walkDirectory(pagesDir)) {
      const relativePath = entry.relativePath;
      const classification = classifyFile(relativePath);

      switch (classification.type) {
        case "page": {
          pages.push({
            filePath: entry.absolutePath,
            route: filePathToRoute(relativePath),
            type: classification.pageType,
            layoutChain: [], // Filled in after all layouts are discovered
          });
          break;
        }
        case "layout": {
          const dir = dirname(relativePath);
          const normalizedDir = dir === "." ? "" : dir.replace(/\\/g, "/");
          layouts.push({
            filePath: entry.absolutePath,
            directory: normalizedDir,
          });
          layoutsByDir.set(normalizedDir, entry.absolutePath);
          break;
        }
        case "system": {
          switch (classification.systemType) {
            case "html":
              systemFiles.html = entry.absolutePath;
              break;
            case "notFound":
              systemFiles.notFound = entry.absolutePath;
              break;
            case "error":
              systemFiles.error = entry.absolutePath;
              break;
            // deno-coverage-ignore-start -- exhaustive check unreachable by design
            default: {
              const _exhaustive: never = classification.systemType;
              throw new Error(`Unhandled system type: ${_exhaustive}`);
            }
              // deno-coverage-ignore-stop
          }
          break;
        }
        case "other":
          // Other files (utilities, assets, etc.) are not included in manifest
          break;
        // deno-coverage-ignore-start -- exhaustive check unreachable by design
        default: {
          const _exhaustive: never = classification;
          throw new Error(`Unhandled classification type: ${_exhaustive}`);
        }
          // deno-coverage-ignore-stop
      }
    }
  }

  // Build layout chains for all pages
  for (const page of pages) {
    const relativePath = page.filePath.slice(pagesDir.length + 1);
    page.layoutChain = buildLayoutChain(relativePath, layoutsByDir);
  }

  // Scan public directory
  if (await exists(publicDir)) {
    for await (const entry of walkDirectory(publicDir)) {
      publicAssets.push({
        filePath: entry.absolutePath,
        urlPath: publicPathToRoute(entry.relativePath),
      });
    }
  }

  return {
    pages,
    layouts,
    systemFiles,
    publicAssets,
  };
}

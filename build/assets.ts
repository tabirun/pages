import { basename, dirname, extname, join, resolve } from "@std/path";
import { copy, ensureDir } from "@std/fs";
import { encodeHex } from "@std/encoding/hex";
import { type BuildAssetResult, BuildError } from "./types.ts";

/**
 * Files that should not be hashed (well-known paths that must keep exact names).
 */
const SKIP_HASH_FILES = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
]);

/**
 * Path prefixes that should not be hashed.
 */
const SKIP_HASH_PREFIXES = [
  "/.well-known/",
];

/**
 * Check if an asset path should skip hashing.
 * Returns true for well-known files that must keep their exact paths.
 */
export function shouldSkipHash(urlPath: string): boolean {
  if (SKIP_HASH_FILES.has(urlPath)) {
    return true;
  }
  return SKIP_HASH_PREFIXES.some((prefix) => urlPath.startsWith(prefix));
}

// Re-export for internal use
export type { BuildAssetResult };

/**
 * Asset entry from scanner.
 */
export interface AssetEntry {
  /** Filesystem path to the asset. */
  filePath: string;
  /** URL path for the asset (e.g., "/images/logo.png"). */
  urlPath: string;
}

/**
 * Options for copying assets with hashing.
 */
export interface CopyAssetsOptions {
  /** Assets to copy. */
  assets: AssetEntry[];
  /** Output directory for the build. */
  outDir: string;
}

/**
 * Copy public assets to output directory with content-based hash suffixes.
 *
 * Transforms filenames from `name.ext` to `name-HASH.ext` where HASH is
 * the first 8 characters of the SHA-256 content hash (uppercase).
 *
 * Well-known files (robots.txt, sitemap.xml, favicon.ico, .well-known/*)
 * are copied without hashing to preserve their expected paths.
 *
 * @param options - Copy options
 * @returns Array of copied asset mappings
 * @throws {BuildError} If asset copying fails
 *
 * @example
 * ```typescript
 * const assets = await copyAssetsWithHashes({
 *   assets: [{ filePath: "/project/public/logo.png", urlPath: "/logo.png" }],
 *   outDir: "/project/dist",
 * });
 * // assets[0].hashedPath might be "/logo-A1B2C3D4.png"
 * ```
 */
export async function copyAssetsWithHashes(
  options: CopyAssetsOptions,
): Promise<BuildAssetResult[]> {
  const { assets, outDir } = options;
  const results: BuildAssetResult[] = [];
  const resolvedOutDir = resolve(outDir);

  for (const asset of assets) {
    try {
      const skipHash = shouldSkipHash(asset.urlPath);

      let outputUrlPath: string;
      if (skipHash) {
        // Copy without hashing
        outputUrlPath = asset.urlPath;
      } else {
        // Read file content and generate hash
        const content = await Deno.readFile(asset.filePath);
        const hash = await generateContentHash(content);
        outputUrlPath = addHashToPath(asset.urlPath, hash);
      }

      const destPath = resolve(join(outDir, outputUrlPath));

      // Ensure destination is within outDir (prevents path traversal)
      if (!destPath.startsWith(resolvedOutDir + "/")) {
        throw new BuildError(
          `Invalid asset path: ${asset.urlPath} escapes output directory`,
        );
      }

      // Copy file to destination
      await ensureDir(dirname(destPath));
      await copy(asset.filePath, destPath);

      results.push({
        originalPath: asset.urlPath,
        hashedPath: outputUrlPath,
        outputPath: destPath,
        wasHashed: !skipHash,
      });
      // deno-coverage-ignore-start -- error handling: BuildError is tested, other errors come from fs operations
    } catch (error) {
      if (error instanceof BuildError) {
        throw error;
      }
      throw new BuildError(
        `Failed to copy asset ${asset.urlPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        undefined,
        { cause: error instanceof Error ? error : undefined },
      );
    }
    // deno-coverage-ignore-stop
  }

  return results;
}

/**
 * Generate a content hash for cache busting.
 * Returns first 8 characters of SHA-256 hash, uppercase.
 */
export async function generateContentHash(
  content: Uint8Array,
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    content as BufferSource,
  );
  const hashHex = encodeHex(new Uint8Array(hashBuffer));
  return hashHex.slice(0, 8).toUpperCase();
}

/**
 * Add a hash suffix to a file path.
 * "/images/logo.png" + "A1B2C3D4" -> "/images/logo-A1B2C3D4.png"
 */
export function addHashToPath(urlPath: string, hash: string): string {
  const ext = extname(urlPath);
  const base = basename(urlPath, ext);
  const dir = dirname(urlPath);

  const hashedFilename = `${base}-${hash}${ext}`;

  if (dir === "/" || dir === ".") {
    return `/${hashedFilename}`;
  }

  return `${dir}/${hashedFilename}`;
}

/**
 * Create a lookup map from original paths to output paths.
 * Only includes assets that were hashed (unchanged paths don't need rewriting).
 *
 * When basePath is provided, both keys and values are prefixed with it.
 * This matches what users write in their HTML (e.g., `/docs/logo.png`).
 *
 * @param assets - Build asset results
 * @param basePath - Optional base path prefix
 * @returns Map from original paths to hashed paths
 */
export function createAssetMap(
  assets: BuildAssetResult[],
  basePath: string = "",
): Map<string, string> {
  const map = new Map<string, string>();
  for (const asset of assets) {
    // Only map assets that were actually hashed
    if (asset.wasHashed) {
      map.set(
        `${basePath}${asset.originalPath}`,
        `${basePath}${asset.hashedPath}`,
      );
    }
  }
  return map;
}

import type { ComponentType } from "preact";
import type { DocumentProps } from "../renderer/types.ts";

/**
 * Options for building the static site.
 */
export interface BuildSiteOptions {
  /**
   * Directory containing pages.
   * Must be an absolute path.
   */
  pagesDir: string;
  /**
   * Output directory for built files.
   * Must be an absolute path.
   * Will be cleaned before build.
   */
  outDir: string;
  /**
   * Custom document component (optional).
   * Uses DefaultDocument if not provided.
   */
  document?: ComponentType<DocumentProps>;
}

/**
 * Result of building a single page.
 */
export interface BuildPageResult {
  /** Route path (e.g., "/blog/post"). */
  route: string;
  /** Absolute path to output HTML file. */
  htmlPath: string;
  /** Absolute path to output JS bundle. */
  bundlePath: string;
  /** Public URL path for the bundle. */
  bundlePublicPath: string;
}

/**
 * Result of copying a public asset.
 */
export interface BuildAssetResult {
  /** Original URL path (e.g., "/images/logo.png"). */
  originalPath: string;
  /** Output URL path (may be hashed or original for well-known files). */
  hashedPath: string;
  /** Absolute path to the output file. */
  outputPath: string;
  /** Whether the asset filename was hashed for cache busting. */
  wasHashed: boolean;
}

/**
 * Result of building the entire site.
 */
export interface BuildSiteResult {
  /** Results for each page built. */
  pages: BuildPageResult[];
  /** Results for each asset copied (with hashes). */
  assets: BuildAssetResult[];
  /** Total build duration in milliseconds. */
  durationMs: number;
}

/**
 * Error thrown when site building fails.
 *
 * Note: Error messages may contain internal file paths.
 * Do not expose directly to end users - log server-side only.
 */
export class BuildError extends Error {
  override name = "BuildError";

  constructor(
    message: string,
    public readonly route?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

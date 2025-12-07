import type { LoadedLayout, LoadedPage } from "../loaders/types.ts";

/**
 * Build mode for bundling.
 *
 * - `development`: Unminified bundles with inline sourcemaps, deterministic filenames
 * - `production`: Minified bundles with content-hashed filenames for cache busting
 */
export type BundleMode = "development" | "production";

/**
 * Options for bundling a page's client-side JavaScript.
 */
export interface BundleClientOptions {
  /** Loaded page to bundle. */
  page: LoadedPage;
  /** Layout chain from root to innermost. */
  layouts: LoadedLayout[];
  /**
   * Route path (e.g., "/blog/post").
   * Must start with "/" and not contain path traversal sequences.
   */
  route: string;
  /**
   * Output directory for bundles. Must be an absolute path.
   * Implementation must validate this is within projectRoot.
   */
  outDir: string;
  /** Build mode. */
  mode: BundleMode;
  /**
   * Project root for resolving imports. Must be an absolute path.
   * All file paths are validated to be within this directory.
   */
  projectRoot: string;
  /**
   * Base path prefix for the site (optional).
   * When set, bundle public paths will be prefixed.
   * @example "/docs"
   */
  basePath?: string;
}

/**
 * Result of bundling a page's client-side JavaScript.
 */
export interface BundleClientResult {
  /** Absolute path to output bundle file. */
  outputPath: string;
  /**
   * URL path for script src (includes basePath if configured).
   * Development: "/__tabi/blog/post.js" or "/docs/__tabi/blog/post.js"
   * Production: "/__tabi/blog/post-a1b2c3.js" or "/docs/__tabi/blog/post-a1b2c3.js"
   */
  publicPath: string;
  /** Content hash for cache busting (production only). */
  hash?: string;
}

/**
 * Error thrown when client bundling fails.
 *
 * Note: Error messages may contain internal file paths.
 * Do not expose directly to end users - log server-side only.
 */
export class BundleError extends Error {
  override name = "BundleError";

  constructor(
    message: string,
    public readonly route: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

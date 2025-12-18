import type { ComponentType } from "preact";
import type { DocumentProps } from "../renderer/types.ts";

/**
 * Options for sitemap generation.
 */
export interface SitemapOptions {
  /**
   * Base URL for the site (e.g., "https://example.com").
   * Required for sitemap generation.
   */
  baseUrl: string;
  /**
   * Routes to exclude from sitemap (in addition to system pages).
   * Supports exact matches and glob patterns.
   * @example ["/admin", "/draft/*"]
   */
  exclude?: string[];
}

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
  /**
   * Sitemap generation options (optional).
   * Only generates sitemap.xml if provided.
   */
  sitemap?: SitemapOptions;
  /**
   * Base path prefix for the site (optional).
   * When set, all system-generated paths (bundles, stylesheets) will be prefixed.
   * @example "/docs"
   */
  basePath?: string;
  /**
   * CSS class name(s) to apply to markdown wrapper divs (optional).
   * Useful for applying typography styles (e.g., "prose" for Tailwind Typography).
   * @example "prose prose-lg"
   */
  markdownClassName?: string;
  /**
   * CSS entry file path (relative to project root).
   * Required when postcss.config.ts exists for CSS processing.
   * @example "./styles/index.css"
   */
  cssEntry?: string;
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
 * Result of CSS compilation.
 */
export interface BuildCSSResult {
  /** Public URL path to the generated CSS file. */
  publicPath: string;
}

/**
 * Result of sitemap generation.
 */
export interface BuildSitemapResult {
  /** Absolute path to the generated sitemap.xml. */
  outputPath: string;
  /** Number of URLs included in sitemap. */
  urlCount: number;
}

/**
 * Result of building the entire site.
 */
export interface BuildSiteResult {
  /** Results for each page built. */
  pages: BuildPageResult[];
  /** Results for each asset copied (with hashes). */
  assets: BuildAssetResult[];
  /** CSS compilation result, if postcss.config.ts and cssEntry exist. */
  css?: BuildCSSResult;
  /** Sitemap generation result, if sitemap options provided. */
  sitemap?: BuildSitemapResult;
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

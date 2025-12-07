import { join } from "@std/path";
import type { BuildSitemapResult, SitemapOptions } from "./types.ts";

/** System routes that are always excluded from sitemap. */
const SYSTEM_ROUTES = new Set(["/_not-found", "/_error"]);

/**
 * Options for generating a sitemap.
 */
export interface GenerateSitemapOptions {
  /** Routes to include (before exclusions). */
  routes: string[];
  /** Sitemap configuration. */
  config: SitemapOptions;
  /** Output directory for sitemap.xml. */
  outDir: string;
}

/**
 * Generate a sitemap.xml file.
 *
 * Excludes system pages (_not-found, _error) by default.
 * Supports additional exclusions via config.exclude patterns.
 *
 * @param options - Generation options
 * @returns Result with output path and URL count
 *
 * @example
 * ```typescript
 * const result = await generateSitemap({
 *   routes: ["/", "/about", "/blog/post"],
 *   config: { baseUrl: "https://example.com" },
 *   outDir: "/project/dist",
 * });
 * // Generates dist/sitemap.xml
 * ```
 */
export async function generateSitemap(
  options: GenerateSitemapOptions,
): Promise<BuildSitemapResult> {
  const { routes, config, outDir } = options;
  const { baseUrl, exclude = [] } = config;

  // Normalize baseUrl (remove trailing slash)
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  // Filter routes
  const includedRoutes = routes.filter((route) => {
    // Always exclude system routes
    if (SYSTEM_ROUTES.has(route)) {
      return false;
    }

    // Check custom exclusions
    return !isExcluded(route, exclude);
  });

  // Generate XML
  const xml = generateSitemapXml(normalizedBaseUrl, includedRoutes);

  // Write file
  const outputPath = join(outDir, "sitemap.xml");
  await Deno.writeTextFile(outputPath, xml);

  return {
    outputPath,
    urlCount: includedRoutes.length,
  };
}

/**
 * Check if a route matches any exclusion pattern.
 */
function isExcluded(route: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (matchesPattern(route, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Match a route against a pattern.
 * Supports exact matches and simple glob patterns with *.
 */
function matchesPattern(route: string, pattern: string): boolean {
  // Exact match
  if (pattern === route) {
    return true;
  }

  // Glob pattern with * (e.g., "/draft/*")
  if (pattern.includes("*")) {
    const regex = patternToRegex(pattern);
    return regex.test(route);
  }

  return false;
}

/**
 * Convert a simple glob pattern to a regex.
 * Only supports * as a wildcard for path segments.
 */
function patternToRegex(pattern: string): RegExp {
  // Escape regex special characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Replace * with regex pattern for path segments
  const regexStr = "^" + escaped.replace(/\*/g, ".*") + "$";
  return new RegExp(regexStr);
}

/**
 * Generate sitemap XML content.
 */
function generateSitemapXml(baseUrl: string, routes: string[]): string {
  const urls = routes
    .map((route) => {
      const loc = route === "/" ? baseUrl : `${baseUrl}${route}`;
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

import { z } from "zod";

/**
 * Schema for site metadata.
 */
export const SiteMetadataSchema: z.ZodObject<{ baseUrl: z.ZodString }> = z
  .object({
    /** Base URL for the site (used for canonical URLs, sitemap, etc.). */
    baseUrl: z.string().url(),
  });

/**
 * Regex for valid basePath segments.
 * Allows empty string or path starting with / containing lowercase alphanumeric, hyphens, and underscores.
 * Examples: "", "/docs", "/my-app", "/my_app", "/docs/v2"
 */
const BASE_PATH_REGEX = /^(\/[a-z0-9_-]+)*$/;

/**
 * Schema for pages factory configuration.
 */
export const PagesConfigSchema: z.ZodType<
  { basePath: string; shikiTheme?: string; siteMetadata?: { baseUrl: string } },
  z.ZodTypeDef,
  {
    basePath?: string;
    shikiTheme?: string;
    siteMetadata?: { baseUrl: string };
  }
> = z.object({
  /**
   * Base path prefix for the site.
   * Must start with / (except empty string for root), no trailing slash.
   * Only lowercase alphanumeric and hyphens allowed in segments.
   * @example "/docs", "/my-app/v2"
   */
  basePath: z
    .string()
    .transform((val) => val.replace(/\/+$/, ""))
    .refine(
      (val) => BASE_PATH_REGEX.test(val),
      "basePath must be empty or start with / and contain only lowercase alphanumeric characters, hyphens, and underscores",
    )
    .optional()
    .default(""),
  /**
   * Shiki theme for syntax highlighting in code blocks.
   * @default "github-dark"
   * @see https://shiki.style/themes
   */
  shikiTheme: z.string().optional(),
  /** Site metadata - required for sitemap.xml generation. */
  siteMetadata: SiteMetadataSchema.optional(),
});

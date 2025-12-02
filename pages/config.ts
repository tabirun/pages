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
 * Schema for pages factory configuration.
 */
export const PagesConfigSchema: z.ZodObject<{
  siteMetadata: z.ZodOptional<typeof SiteMetadataSchema>;
}> = z.object({
  /** Site metadata - required for sitemap.xml and robots.txt generation. */
  siteMetadata: SiteMetadataSchema.optional(),
});

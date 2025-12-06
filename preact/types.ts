/**
 * Frontmatter extracted from page files.
 */
export interface Frontmatter {
  /** Page title. */
  title?: string;
  /** Page description. */
  description?: string;
  /** Draft status - excluded from production builds. */
  draft?: boolean;
  /** Additional custom fields. */
  [key: string]: unknown;
}

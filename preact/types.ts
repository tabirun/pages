/**
 * Frontmatter extracted from page files.
 */
export interface Frontmatter {
  /** Page title. */
  title?: string;
  /** Page description. */
  description?: string;
  /** Additional custom fields. */
  [key: string]: unknown;
}

/**
 * Frontmatter extracted from page files.
 */
export interface Frontmatter {
  /** Page title. */
  title?: string;
  /** Page description. */
  description?: string;
  /** Additional frontmatter fields. */
  [key: string]: unknown;
}

/**
 * Props for the Code component.
 */
export interface CodeProps {
  /** Language for syntax highlighting. */
  lang?: string;
  /** Code content. */
  children: string;
}

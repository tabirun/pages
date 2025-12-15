import type { ComponentChildren, ComponentType } from "preact";
import type { ZodError, ZodSchema } from "zod";

/**
 * Page frontmatter with optional common fields.
 */
export interface PageFrontmatter {
  /** Page title. */
  title?: string;
  /** Page description. */
  description?: string;
  /** Additional custom fields. */
  [key: string]: unknown;
}

/**
 * Loaded markdown page.
 */
export interface LoadedMarkdownPage {
  type: "markdown";
  /** Validated frontmatter. */
  frontmatter: PageFrontmatter;
  /** Raw markdown content (without frontmatter). */
  content: string;
  /** Source file path. */
  filePath: string;
}

/**
 * Loaded TSX page.
 */
export interface LoadedTsxPage {
  type: "tsx";
  /** Validated frontmatter from exported `frontmatter` const. */
  frontmatter: PageFrontmatter;
  /** Default exported component. */
  component: ComponentType;
  /** Source file path. */
  filePath: string;
}

/**
 * Union of loaded page types.
 */
export type LoadedPage = LoadedMarkdownPage | LoadedTsxPage;

/**
 * Layout component props.
 * Layouts access frontmatter via useFrontmatter() hook, not props.
 */
export interface LayoutProps {
  /** Page content (children). */
  children: ComponentChildren;
}

/**
 * Loaded layout.
 */
export interface LoadedLayout {
  /** Default exported layout component. */
  component: ComponentType<LayoutProps>;
  /** Source file path. */
  filePath: string;
  /** Directory this layout applies to. */
  directory: string;
}

/**
 * Options for loading pages.
 */
export interface LoadOptions {
  /** Custom frontmatter schema for validation. */
  frontmatterSchema?: ZodSchema;
}

/**
 * Error thrown when a loader fails to load a file.
 */
export class LoaderError extends Error {
  override name = "LoaderError";

  constructor(
    message: string,
    public readonly filePath: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Error thrown when frontmatter validation fails.
 */
export class FrontmatterError extends LoaderError {
  override name = "FrontmatterError";

  constructor(
    message: string,
    filePath: string,
    public readonly validationErrors: ZodError,
  ) {
    super(message, filePath);
  }
}

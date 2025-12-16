import type { ComponentChildren, ComponentType } from "preact";
import type { LoadedLayout, LoadedPage } from "../loaders/types.ts";

/**
 * Props for the document component.
 *
 * The document component defines the HTML document shell (html, head, body).
 * A default implementation is provided (DefaultDocument in document.tsx).
 *
 * The renderer handles all hydration internals:
 * - Wrapping content in the hydration root element
 * - Injecting data and bundle scripts
 *
 * Custom document components only need to customize the HTML structure
 * (e.g., add lang attribute, extra head elements, body classes).
 *
 * @example
 * ```tsx
 * function CustomDocument({ head, children }: DocumentProps) {
 *   return (
 *     <html lang="en" className="dark">
 *       <head>
 *         <link rel="stylesheet" href="/fonts.css" />
 *         {head}
 *       </head>
 *       <body className="antialiased">{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */
export interface DocumentProps {
  /**
   * Content extracted from Head components, rendered as children of <head>.
   * Place after any default meta tags you want to include.
   */
  head: ComponentChildren;
  /**
   * Complete body content including hydration root and scripts.
   * Pre-assembled by the renderer - just place in <body>.
   */
  children: ComponentChildren;
}

/**
 * Options for rendering a page.
 */
export interface RenderPageOptions {
  /** Loaded page (markdown or TSX). */
  page: LoadedPage;
  /**
   * Layout chain from root to innermost.
   * Order must match scanner's layoutChain output.
   */
  layouts: LoadedLayout[];
  /**
   * Path to client bundle for hydration script.
   * Dev mode: deterministic path (e.g., "/_tabi/blog/post.js")
   * Build mode: content-hashed path (e.g., "/_tabi/blog/post-a1b2c3.js")
   */
  clientBundlePath: string;
  /** Route path for serialized data (e.g., "/blog/post"). */
  route: string;
  /** Custom document component (optional). Uses DefaultDocument if not provided. */
  document?: ComponentType<DocumentProps>;
  /** Base path prefix for the site (e.g., "/docs"). Defaults to empty string. */
  basePath?: string;
  /** CSS class name(s) to apply to markdown wrapper divs. */
  markdownClassName?: string;
}

/**
 * Result of rendering a page.
 */
export interface RenderPageResult {
  /** Complete HTML5 document string with `<!DOCTYPE html>` declaration. */
  html: string;
}

/**
 * Error thrown when page rendering fails.
 */
export class RenderError extends Error {
  override name = "RenderError";

  constructor(
    message: string,
    public readonly route: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

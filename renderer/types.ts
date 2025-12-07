import type { ComponentChildren, ComponentType } from "preact";
import type { LoadedLayout, LoadedPage } from "../loaders/types.ts";

/**
 * Props for the document component.
 *
 * The document component wraps the entire HTML document structure.
 * A default implementation is provided (DefaultDocument in document.tsx).
 * It receives the rendered body content, extracted head content,
 * and scripts for hydration.
 *
 * SECURITY: Custom document implementations MUST NOT modify or double-unescape
 * the dataScript and bundleScript strings. These are pre-escaped and ready
 * for direct HTML embedding via dangerouslySetInnerHTML.
 */
export interface DocumentProps {
  /**
   * Content extracted from Head components, rendered as children of <head>.
   * This content is already escaped by processHeadMarkers.
   */
  head: ComponentChildren;
  /** SSR rendered body content. */
  children: ComponentChildren;
  /**
   * Serialized page data as a complete script tag string.
   * Pre-escaped and ready for embedding via dangerouslySetInnerHTML.
   * Example: `<script id="__TABI_DATA__" type="application/json">...</script>`
   */
  dataScript: string;
  /**
   * Client bundle as a complete script tag string.
   * Pre-escaped and ready for embedding via dangerouslySetInnerHTML.
   * Example: `<script type="module" src="/_tabi/blog/post.js"></script>`
   */
  bundleScript: string;
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

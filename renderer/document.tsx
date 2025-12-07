import type { JSX } from "preact";
import type { DocumentProps } from "./types.ts";

/**
 * Default document component that wraps the rendered page in a complete HTML structure.
 *
 * This component provides the standard HTML5 document shell including:
 * - html, head, and body elements
 * - Default meta tags (charset, viewport)
 * - Head content slot for page-specific elements
 *
 * The renderer handles hydration internals (root element, scripts) before
 * passing content as children. Custom documents only need to define the
 * HTML shell structure.
 *
 * @param props - Document props containing head content and body children
 * @returns Complete HTML document structure (DOCTYPE added by renderer)
 *
 * @example
 * ```tsx
 * // Custom document with additional customization
 * function CustomDocument({ head, children }: DocumentProps) {
 *   return (
 *     <html lang="en">
 *       <head>
 *         <meta charSet="UTF-8" />
 *         <link rel="icon" href="/favicon.ico" />
 *         {head}
 *       </head>
 *       <body className="dark">{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */
export function DefaultDocument({
  head,
  children,
}: DocumentProps): JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {head}
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Rewrite asset references in HTML to use hashed paths.
 *
 * Updates:
 * - `src` attributes
 * - `href` attributes
 * - `url()` references in inline styles
 *
 * @param html - Original HTML string
 * @param assetMap - Map from original paths to hashed paths
 * @returns HTML with updated asset references
 *
 * @example
 * ```typescript
 * const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
 * const html = '<img src="/logo.png">';
 * const result = rewriteAssetUrls(html, assetMap);
 * // result: '<img src="/logo-A1B2C3D4.png">'
 * ```
 */
export function rewriteAssetUrls(
  html: string,
  assetMap: Map<string, string>,
): string {
  if (assetMap.size === 0) {
    return html;
  }

  let result = html;

  // Rewrite src attributes: src="/path" or src='/path'
  result = result.replace(
    /\bsrc=(["'])([^"']+)\1/g,
    (_match, quote, path) => {
      const hashedPath = assetMap.get(path);
      return `src=${quote}${hashedPath ?? path}${quote}`;
    },
  );

  // Rewrite href attributes: href="/path" or href='/path'
  result = result.replace(
    /\bhref=(["'])([^"']+)\1/g,
    (_match, quote, path) => {
      const hashedPath = assetMap.get(path);
      return `href=${quote}${hashedPath ?? path}${quote}`;
    },
  );

  // Rewrite url() in inline styles: url("/path") or url('/path') or url(/path)
  result = result.replace(
    /\burl\((['"]?)([^'")]+)\1\)/g,
    (_match, quote, path) => {
      const hashedPath = assetMap.get(path);
      return `url(${quote}${hashedPath ?? path}${quote})`;
    },
  );

  return result;
}

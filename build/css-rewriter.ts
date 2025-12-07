/**
 * Rewrite url() values in CSS using asset map.
 *
 * Users must include basePath in their CSS paths when configured.
 * This function only applies content hashes from the asset map.
 *
 * @param css - Original CSS string
 * @param assetMap - Map from original paths to hashed paths
 * @returns CSS with updated url() references
 *
 * @example
 * ```typescript
 * const assetMap = new Map([["/docs/logo.png", "/docs/logo-A1B2C3D4.png"]]);
 * const css = 'background: url("/docs/logo.png");';
 * const result = rewriteCssUrls(css, assetMap);
 * // result: 'background: url("/docs/logo-A1B2C3D4.png");'
 * ```
 */
export function rewriteCssUrls(
  css: string,
  assetMap: Map<string, string>,
): string {
  if (assetMap.size === 0) {
    return css;
  }

  return css.replace(
    /\burl\((['"]?)([^'")]+)\1\)/g,
    (match, quote, path) => {
      const hashedPath = assetMap.get(path);
      return hashedPath ? `url(${quote}${hashedPath}${quote})` : match;
    },
  );
}

/**
 * Escapes HTML special characters to prevent XSS and ensure
 * content renders correctly when embedded in HTML.
 *
 * @param text - The text to escape
 * @returns The escaped text with HTML entities
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Unescapes HTML entities back to their original characters.
 * Used to restore content that was escaped during SSR.
 *
 * Order matters: &amp; must be last to avoid double-unescaping.
 * For example, "&amp;lt;" should become "&lt;", not "<".
 *
 * @param text - The text with HTML entities to unescape
 * @returns The unescaped text
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

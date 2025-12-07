/**
 * Escapes a file path for safe use in a JavaScript import statement.
 *
 * Prevents code injection by escaping characters that could break
 * out of quoted import paths in generated JavaScript code.
 *
 * @param path - The file path to escape
 * @returns The escaped path safe for JS import statements
 */
export function escapePathForJs(path: string): string {
  return path
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
}

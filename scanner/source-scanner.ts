import { exists, walk } from "@std/fs";
import { join } from "@std/path";

/** File extensions to scan for class usage. */
const SCAN_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".md",
  ".html",
]);

/**
 * Scan project source files and collect content for class extraction.
 *
 * Used by UnoCSS to scan for utility class usage in source files.
 * Skips test files based on filename patterns.
 *
 * @param projectRoot - Project root directory
 * @returns Concatenated content of all source files
 *
 * @example
 * ```typescript
 * const content = await scanSourceContent("/project");
 * // Pass to UnoCSS generator for class extraction
 * ```
 */
export async function scanSourceContent(projectRoot: string): Promise<string> {
  const contents: string[] = [];
  const pagesDir = join(projectRoot, "pages");

  // Return empty if pages directory doesn't exist
  if (!(await exists(pagesDir))) {
    return "";
  }

  // Scan pages directory for source files
  // followSymlinks: false prevents path traversal attacks via symlinks
  for await (
    const entry of walk(pagesDir, {
      includeDirs: false,
      followSymlinks: false,
      exts: [...SCAN_EXTENSIONS].map((ext) => ext.slice(1)), // Remove leading dot
    })
  ) {
    // Skip test files based on filename patterns only (not path)
    const filename = entry.name;
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      continue;
    }

    const content = await Deno.readTextFile(entry.path);
    contents.push(content);
  }

  return contents.join("\n");
}

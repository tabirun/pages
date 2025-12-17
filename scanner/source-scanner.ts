import { exists, walk } from "@std/fs";

/** File extensions to scan for class usage. */
const SCAN_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".md",
  ".html",
]);

/** Directories to skip when scanning project root. */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".tabi",
  ".git",
  ".git-hooks",
  "dist",
  ".cache",
  "coverage",
  ".vscode",
  ".idea",
]);

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build skip patterns anchored to the project root.
 * Only skips directories directly under the root, not nested paths
 * that happen to contain the directory name.
 */
function buildSkipPatterns(projectRoot: string): RegExp[] {
  const escapedRoot = escapeRegExp(projectRoot.replace(/\/$/, ""));
  return [...SKIP_DIRECTORIES].map(
    (dir) => new RegExp(`^${escapedRoot}/${escapeRegExp(dir)}(/|$)`),
  );
}

/**
 * Scan project source files and collect content for class extraction.
 *
 * Used by UnoCSS to scan for utility class usage in source files.
 * Scans both root-level files and the pages directory.
 * Skips test files based on filename patterns and common directories
 * like node_modules, .tabi, .git, etc. at the project root level.
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

  // Return empty if project root doesn't exist
  if (!(await exists(projectRoot))) {
    return "";
  }

  // Build skip patterns anchored to the project root
  const skipPatterns = buildSkipPatterns(projectRoot);

  // Scan entire project with directory filtering
  // followSymlinks: false prevents path traversal attacks via symlinks
  for await (
    const entry of walk(projectRoot, {
      includeDirs: false,
      followSymlinks: false,
      exts: [...SCAN_EXTENSIONS].map((ext) => ext.slice(1)), // Remove leading dot
      skip: skipPatterns,
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

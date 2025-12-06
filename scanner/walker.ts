import { walk } from "@std/fs";
import { relative } from "@std/path";

/**
 * Entry representing a discovered file.
 */
export interface WalkEntry {
  /** Absolute path to the file. */
  absolutePath: string;
  /** Path relative to the walked directory. */
  relativePath: string;
}

/**
 * Directories to skip during walking (in addition to hidden directories).
 */
const SKIP_DIRS = new Set(["node_modules", "dist"]);

/**
 * Checks if a path segment is a hidden directory (starts with dot).
 * Does not treat current directory "." as hidden.
 */
function isHiddenDir(name: string): boolean {
  return name.startsWith(".") && name !== ".";
}

/**
 * Checks if a path contains any directory that should be skipped.
 * Only checks directory segments, not the file name itself.
 */
function shouldSkipPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  // Check all segments except the last one (the file name)
  const dirSegments = segments.slice(0, -1);
  return dirSegments.some((seg) => SKIP_DIRS.has(seg) || isHiddenDir(seg));
}

/**
 * Walks a directory recursively, yielding file entries.
 *
 * Skips node_modules, dist, and hidden directories (starting with dot).
 * Only yields files, not directories.
 *
 * @param dir - Directory to walk (absolute path)
 * @yields WalkEntry for each file found
 */
export async function* walkDirectory(dir: string): AsyncGenerator<WalkEntry> {
  for await (const entry of walk(dir, { includeDirs: false })) {
    const relativePath = relative(dir, entry.path);

    if (shouldSkipPath(relativePath)) {
      continue;
    }

    yield {
      absolutePath: entry.path,
      relativePath,
    };
  }
}

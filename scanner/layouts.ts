import { dirname } from "@std/path";

/**
 * Builds the layout chain for a page file.
 *
 * Collects all layouts from the root directory to the page's directory,
 * ordered from root to leaf (outermost to innermost).
 *
 * @param pageRelativePath - Page path relative to pages directory
 * @param layoutsByDir - Map of directory paths to absolute layout file paths
 * @returns Array of absolute layout paths, ordered root to leaf
 *
 * @example
 * const layouts = new Map([
 *   ["", "/pages/_layout.tsx"],
 *   ["blog", "/pages/blog/_layout.tsx"],
 * ]);
 * buildLayoutChain("blog/post.md", layouts);
 * // ["/pages/_layout.tsx", "/pages/blog/_layout.tsx"]
 */
export function buildLayoutChain(
  pageRelativePath: string,
  layoutsByDir: Map<string, string>,
): string[] {
  const chain: string[] = [];

  // Normalize path separators
  const normalizedPath = pageRelativePath.replace(/\\/g, "/");

  // Get the directory containing the page
  const pageDir = dirname(normalizedPath);

  // Build list of directories from root to page's directory
  const dirs: string[] = [""];
  if (pageDir !== ".") {
    const parts = pageDir.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      dirs.push(current);
    }
  }

  // Collect layouts in order from root to leaf
  for (const dir of dirs) {
    const layout = layoutsByDir.get(dir);
    if (layout) {
      chain.push(layout);
    }
  }

  return chain;
}

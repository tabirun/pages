const INDEX_SUFFIX = "/index";

/**
 * Converts a page file path to a URL route.
 *
 * Assumes input is a valid page file path (.md or .tsx) from the walker.
 * Other extensions are passed through unchanged.
 *
 * Rules:
 * - Normalizes path separators to forward slashes
 * - Removes .md/.tsx extension
 * - Converts index files to directory path (e.g., "blog/index.md" -> "/blog")
 * - Adds leading slash
 *
 * @param relativePath - Path relative to pages directory
 * @returns URL route (e.g., "/blog/hello-world")
 *
 * @example
 * filePathToRoute("index.md") // "/"
 * filePathToRoute("about.tsx") // "/about"
 * filePathToRoute("blog/index.md") // "/blog"
 * filePathToRoute("blog/hello-world.md") // "/blog/hello-world"
 */
export function filePathToRoute(relativePath: string): string {
  // Normalize path separators
  let route = relativePath.replace(/\\/g, "/");

  // Remove extension
  route = route.replace(/\.(md|tsx)$/, "");

  // Handle index files
  if (route === "index") {
    return "/";
  }
  if (route.endsWith(INDEX_SUFFIX)) {
    route = route.slice(0, -INDEX_SUFFIX.length);
  }

  // Add leading slash
  return "/" + route;
}

/**
 * Converts a public asset path to a URL path.
 *
 * Rules:
 * - Normalizes path separators to forward slashes
 * - Adds leading slash
 *
 * @param relativePath - Path relative to public directory
 * @returns URL path (e.g., "/favicon.ico")
 *
 * @example
 * publicPathToRoute("favicon.ico") // "/favicon.ico"
 * publicPathToRoute("images/logo.png") // "/images/logo.png"
 */
export function publicPathToRoute(relativePath: string): string {
  // Normalize path separators
  const route = relativePath.replace(/\\/g, "/");

  // Add leading slash
  return "/" + route;
}

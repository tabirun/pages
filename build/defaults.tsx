import { dirname, fromFileUrl, join } from "@std/path";
import type { LoadedTsxPage } from "../loaders/types.ts";

// Import default components for server-side rendering
import DefaultNotFound, {
  frontmatter as notFoundFrontmatter,
} from "./defaults/_not-found.tsx";
import DefaultError, {
  frontmatter as errorFrontmatter,
} from "./defaults/_error.tsx";

/** Whether running from local file system or remote (JSR). */
const IS_LOCAL = new URL(import.meta.url).protocol === "file:";

/**
 * Resolve path to a default page file.
 * Handles both local (file://) and remote (https://) module URLs.
 * Remote URLs occur when package is consumed from JSR.
 */
function resolveDefaultPath(filename: string): string {
  if (IS_LOCAL) {
    // Local development: use file path
    return join(dirname(fromFileUrl(import.meta.url)), "defaults", filename);
  }

  // Remote (JSR): use URL directly - esbuild handles HTTP imports
  return new URL(`./defaults/${filename}`, import.meta.url).href;
}

/**
 * Create a LoadedTsxPage for the default not found page.
 */
export function createDefaultNotFoundPage(): LoadedTsxPage {
  return {
    type: "tsx",
    frontmatter: notFoundFrontmatter,
    component: DefaultNotFound,
    filePath: resolveDefaultPath("_not-found.tsx"),
  };
}

/**
 * Create a LoadedTsxPage for the default error page.
 */
export function createDefaultErrorPage(): LoadedTsxPage {
  return {
    type: "tsx",
    frontmatter: errorFrontmatter,
    component: DefaultError,
    filePath: resolveDefaultPath("_error.tsx"),
  };
}

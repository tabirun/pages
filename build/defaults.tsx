import { dirname, fromFileUrl, join } from "@std/path";
import type { LoadedTsxPage } from "../loaders/types.ts";

// Import default components for server-side rendering
import DefaultNotFound, {
  frontmatter as notFoundFrontmatter,
} from "./defaults/_not-found.tsx";
import DefaultError, {
  frontmatter as errorFrontmatter,
} from "./defaults/_error.tsx";

// Resolve file paths for client bundling (using fromFileUrl for Windows compatibility)
const DEFAULTS_DIR = join(
  dirname(fromFileUrl(import.meta.url)),
  "defaults",
);

/**
 * Create a LoadedTsxPage for the default not found page.
 */
export function createDefaultNotFoundPage(): LoadedTsxPage {
  return {
    type: "tsx",
    frontmatter: notFoundFrontmatter,
    component: DefaultNotFound,
    filePath: join(DEFAULTS_DIR, "_not-found.tsx"),
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
    filePath: join(DEFAULTS_DIR, "_error.tsx"),
  };
}

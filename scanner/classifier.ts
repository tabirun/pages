import { basename } from "@std/path";

/**
 * Classification result for a file.
 */
export type FileClassification =
  | { type: "page"; pageType: "markdown" | "tsx" }
  | { type: "layout" }
  | { type: "system"; systemType: "html" | "notFound" | "error" }
  | { type: "other" };

/**
 * System file names and their types.
 */
const SYSTEM_FILES: Record<string, "html" | "notFound" | "error"> = {
  "_html.tsx": "html",
  "_not-found.tsx": "notFound",
  "_error.tsx": "error",
};

/**
 * Classifies a file based on its path.
 *
 * Classification rules:
 * - `*.md` -> page (markdown)
 * - `_layout.tsx` -> layout
 * - `_html.tsx`, `_not-found.tsx`, `_error.tsx` -> system
 * - `_*.tsx` -> other (private components, utilities)
 * - `*.tsx` -> page (tsx)
 * - Everything else -> other (assets, utilities, etc.)
 *
 * @param filePath - Absolute or relative path to the file
 * @returns Classification result
 */
export function classifyFile(filePath: string): FileClassification {
  const fileName = basename(filePath);

  // Markdown files are always pages
  if (fileName.endsWith(".md")) {
    return { type: "page", pageType: "markdown" };
  }

  // Non-TSX files are other (could be assets, utilities, etc.)
  if (!fileName.endsWith(".tsx")) {
    return { type: "other" };
  }

  // Check for layout
  if (fileName === "_layout.tsx") {
    return { type: "layout" };
  }

  // Check for system files
  const systemType = SYSTEM_FILES[fileName];
  if (systemType) {
    return { type: "system", systemType };
  }

  // Other underscore-prefixed TSX files (private components, utilities)
  if (fileName.startsWith("_")) {
    return { type: "other" };
  }

  // Regular TSX files are pages
  return { type: "page", pageType: "tsx" };
}

import { extname } from "@std/path";
import { loadMarkdownPage } from "./markdown-loader.ts";
import { loadTsxPage } from "./tsx-loader.ts";
import { type LoadedPage, LoaderError } from "./types.ts";

/**
 * Load a page file (markdown or TSX).
 *
 * @param filePath - Absolute path to page file
 * @returns Loaded page
 * @throws {LoaderError} If file type is unsupported or loading fails
 * @throws {FrontmatterError} If frontmatter validation fails
 */
export async function loadPage(filePath: string): Promise<LoadedPage> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".md":
      return await loadMarkdownPage(filePath);
    case ".tsx":
      return await loadTsxPage(filePath);
    default:
      throw new LoaderError(`Unsupported page file type: ${ext}`, filePath);
  }
}

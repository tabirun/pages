import { parseFrontmatter } from "./frontmatter.ts";
import { type LoadedMarkdownPage, LoaderError } from "./types.ts";

/**
 * Load a markdown page file.
 *
 * @param filePath - Absolute path to .md file
 * @returns Loaded markdown page
 * @throws {LoaderError} If file cannot be read
 * @throws {FrontmatterError} If frontmatter validation fails
 */
export async function loadMarkdownPage(
  filePath: string,
): Promise<LoadedMarkdownPage> {
  let raw: string;
  try {
    raw = await Deno.readTextFile(filePath);
  } catch (error) {
    // deno-coverage-ignore-start -- Deno.readTextFile always throws Error instances, String() fallback is defensive
    throw new LoaderError(
      `Failed to read file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }

  const { frontmatter, content } = parseFrontmatter(raw, filePath);

  return {
    type: "markdown",
    frontmatter,
    content,
    filePath,
  };
}

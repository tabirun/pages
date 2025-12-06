import type { ComponentType } from "preact";
import { PageFrontmatterSchema } from "./frontmatter.ts";
import { FrontmatterError, type LoadedTsxPage, LoaderError } from "./types.ts";

/**
 * Load a TSX page file.
 *
 * @param filePath - Absolute path to .tsx file
 * @returns Loaded TSX page
 * @throws {LoaderError} If file cannot be imported or has no default export
 * @throws {FrontmatterError} If frontmatter validation fails
 */
export async function loadTsxPage(filePath: string): Promise<LoadedTsxPage> {
  const fileUrl = `file://${filePath}`;

  let module: Record<string, unknown>;
  try {
    module = await import(fileUrl);
  } catch (error) {
    // deno-coverage-ignore-start -- import() always throws Error instances, String() fallback is defensive
    throw new LoaderError(
      `Failed to import TSX file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }

  const component = module.default;
  if (typeof component !== "function") {
    throw new LoaderError(
      "TSX page must have a default export that is a component function",
      filePath,
    );
  }

  const rawFrontmatter = module.frontmatter ?? {};

  if (
    typeof rawFrontmatter !== "object" ||
    rawFrontmatter === null ||
    Array.isArray(rawFrontmatter)
  ) {
    throw new LoaderError(
      "TSX page frontmatter export must be an object",
      filePath,
    );
  }

  const result = PageFrontmatterSchema.safeParse(rawFrontmatter);
  if (!result.success) {
    throw new FrontmatterError(
      "Frontmatter validation failed",
      filePath,
      result.error,
    );
  }

  return {
    type: "tsx",
    frontmatter: result.data,
    component: component as ComponentType,
    filePath,
  };
}

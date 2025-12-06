import { parse as parseYaml } from "@std/yaml";
import { z, type ZodSchema } from "zod";
import {
  FrontmatterError,
  LoaderError,
  type PageFrontmatter,
} from "./types.ts";

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Zod schema for page frontmatter.
 */
export const PageFrontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  draft: z.boolean().optional(),
}).passthrough();

/**
 * Result of parsing frontmatter from content.
 */
export interface ParsedFrontmatter<T = PageFrontmatter> {
  /** Validated frontmatter object. */
  frontmatter: T;
  /** Content without the frontmatter block. */
  content: string;
}

/**
 * Parse and validate frontmatter from markdown content.
 *
 * @param raw - Raw file content with optional frontmatter
 * @param filePath - File path for error messages
 * @param schema - Zod schema for validation (defaults to PageFrontmatterSchema)
 * @returns Parsed frontmatter and content
 * @throws {FrontmatterError} If frontmatter fails validation
 */
export function parseFrontmatter<T = PageFrontmatter>(
  raw: string,
  filePath: string,
  schema: ZodSchema<T> = PageFrontmatterSchema as unknown as ZodSchema<T>,
): ParsedFrontmatter<T> {
  const match = raw.match(FRONTMATTER_REGEX);

  if (!match) {
    const result = schema.safeParse({});
    if (!result.success) {
      throw new FrontmatterError(
        "Frontmatter validation failed",
        filePath,
        result.error,
      );
    }
    return {
      frontmatter: result.data,
      content: raw,
    };
  }

  const yamlContent = match[1];
  const content = raw.slice(match[0].length);

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    // deno-coverage-ignore-start -- parseYaml always throws Error instances, String() fallback is defensive
    throw new LoaderError(
      `Invalid YAML in frontmatter: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }

  if (parsed === null || parsed === undefined) {
    parsed = {};
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new LoaderError("Frontmatter must be an object", filePath);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new FrontmatterError(
      "Frontmatter validation failed",
      filePath,
      result.error,
    );
  }

  return {
    frontmatter: result.data,
    content,
  };
}

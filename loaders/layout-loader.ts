import type { ComponentType } from "preact";
import { type LayoutProps, type LoadedLayout, LoaderError } from "./types.ts";

/**
 * Load a layout file.
 *
 * @param filePath - Absolute path to _layout.tsx file
 * @param directory - Directory this layout applies to
 * @returns Loaded layout
 * @throws {LoaderError} If file cannot be imported or has no default export
 */
export async function loadLayout(
  filePath: string,
  directory: string,
): Promise<LoadedLayout> {
  const fileUrl = `file://${filePath}`;

  let module: Record<string, unknown>;
  try {
    module = await import(fileUrl);
  } catch (error) {
    // deno-coverage-ignore-start -- import() always throws Error instances, String() fallback is defensive
    throw new LoaderError(
      `Failed to import layout file: ${
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
      "Layout must have a default export that is a component function",
      filePath,
    );
  }

  return {
    component: component as ComponentType<LayoutProps>,
    filePath,
    directory,
  };
}

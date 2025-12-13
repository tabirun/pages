import type { ComponentType } from "preact";
import { dirname } from "@std/path";
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

/**
 * Load a chain of layouts with optional caching.
 *
 * @param layoutPaths - Absolute paths to layout files, root to leaf order
 * @param cache - Optional cache map for efficiency when loading multiple pages
 * @returns Loaded layouts in same order
 */
export async function loadLayoutChain(
  layoutPaths: string[],
  cache?: Map<string, LoadedLayout>,
): Promise<LoadedLayout[]> {
  const layouts: LoadedLayout[] = [];

  for (const layoutPath of layoutPaths) {
    let layout = cache?.get(layoutPath);
    if (!layout) {
      const dir = dirname(layoutPath);
      layout = await loadLayout(layoutPath, dir);
      cache?.set(layoutPath, layout);
    }
    layouts.push(layout);
  }

  return layouts;
}

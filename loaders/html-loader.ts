import type { ComponentType } from "preact";
import type { DocumentProps } from "../renderer/types.ts";
import { LoaderError } from "./types.ts";

/**
 * Loaded HTML document template.
 */
export interface LoadedDocument {
  /** Document component. */
  component: ComponentType<DocumentProps>;
  /** Source file path. */
  filePath: string;
}

/**
 * Load a custom HTML document template (_html.tsx).
 *
 * The document component receives DocumentProps and must render
 * the full HTML structure (html, head, body elements).
 *
 * @param filePath - Absolute path to _html.tsx file
 * @returns Loaded document component
 * @throws {LoaderError} If file cannot be imported or has no default export
 *
 * @example
 * ```typescript
 * const doc = await loadDocument("/project/pages/_html.tsx");
 * // Use doc.component in renderPage({ document: doc.component, ... })
 * ```
 */
export async function loadDocument(filePath: string): Promise<LoadedDocument> {
  const fileUrl = `file://${filePath}`;

  let module: Record<string, unknown>;
  try {
    module = await import(fileUrl);
  } catch (error) {
    throw new LoaderError(
      `Failed to import document file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      { cause: error instanceof Error ? error : undefined },
    );
  }

  const component = module.default;
  if (typeof component !== "function") {
    throw new LoaderError(
      "Document must have a default export that is a component function",
      filePath,
    );
  }

  return {
    component: component as ComponentType<DocumentProps>,
    filePath,
  };
}

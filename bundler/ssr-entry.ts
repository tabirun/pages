import { dirname } from "@std/path";
import { escapePathForJs } from "../utils/js.ts";
import type { PageEntry } from "../scanner/types.ts";

/**
 * Options for generating SSR entry code.
 */
export interface SSREntryOptions {
  /** Page entry from manifest. */
  pageEntry: PageEntry;
  /** Whether the page is a TSX page (vs markdown). */
  isTsx: boolean;
}

/**
 * Generate SSR entry code for a page.
 *
 * Creates a virtual entry file that:
 * 1. Imports all layouts in the chain
 * 2. Imports the page component (TSX only)
 * 3. Exports page and layouts in the format expected by renderPage
 *
 * For markdown pages, only layouts are bundled. The markdown content
 * is loaded directly via Deno.readTextFile (no cache issues).
 *
 * @param options - Entry generation options
 * @returns Generated TypeScript entry code
 *
 * @internal
 */
export function generateSSREntry(options: SSREntryOptions): string {
  const { pageEntry, isTsx } = options;
  const lines: string[] = [];

  // Import layouts
  for (let i = 0; i < pageEntry.layoutChain.length; i++) {
    lines.push(
      `import Layout${i} from "${escapePathForJs(pageEntry.layoutChain[i])}";`,
    );
  }

  // Import page component (TSX only)
  // Use namespace import so frontmatter is optional
  if (isTsx) {
    lines.push(
      `import PageComponent, * as pageModule from "${
        escapePathForJs(pageEntry.filePath)
      }";`,
    );
  }

  lines.push("");

  // Export page (TSX only)
  if (isTsx) {
    lines.push("export const page = {");
    lines.push('  type: "tsx" as const,');
    lines.push("  component: PageComponent,");
    lines.push("  frontmatter: pageModule.frontmatter ?? {},");
    lines.push(`  filePath: "${escapePathForJs(pageEntry.filePath)}",`);
    lines.push("};");
    lines.push("");
  }

  // Export layouts
  lines.push("export const layouts = [");
  for (let i = 0; i < pageEntry.layoutChain.length; i++) {
    const layoutPath = pageEntry.layoutChain[i];
    const layoutDir = dirname(layoutPath);
    lines.push("  {");
    lines.push(`    component: Layout${i},`);
    lines.push(`    filePath: "${escapePathForJs(layoutPath)}",`);
    lines.push(`    directory: "${escapePathForJs(layoutDir)}",`);
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");

  return lines.join("\n");
}

import type { LoadedLayout, LoadedPage } from "../loaders/mod.ts";

/**
 * Generate client entry code for a page.
 *
 * Creates a virtual entry file that:
 * 1. Imports hydrate from Preact
 * 2. Imports FrontmatterProvider (and Markdown for markdown pages)
 * 3. Imports all layouts in the chain
 * 4. Imports the page component (TSX only)
 * 5. Reads page data from __TABI_DATA__ script
 * 6. Composes the component tree matching server-side composition
 * 7. Hydrates into __tabi__ root element
 *
 * @param page - Loaded page (markdown or TSX)
 * @param layouts - Layout chain from root to innermost
 * @param preactModulePath - Absolute path to preact/mod.ts for imports
 * @returns Generated TypeScript/JSX entry code
 *
 * @example
 * ```typescript
 * const entryCode = generateClientEntry(page, layouts, "/project/preact/mod.ts");
 * // Use entryCode as esbuild stdin content
 * ```
 *
 * @internal
 */
export function generateClientEntry(
  page: LoadedPage,
  layouts: LoadedLayout[],
  preactModulePath: string,
): string {
  const lines: string[] = [];

  // Import hydrate from Preact
  lines.push('import { hydrate } from "preact";');

  // Import from framework preact module
  if (page.type === "markdown") {
    lines.push(
      `import { FrontmatterProvider, Markdown } from "${
        fileUrl(preactModulePath)
      }";`,
    );
  } else {
    lines.push(
      `import { FrontmatterProvider } from "${fileUrl(preactModulePath)}";`,
    );
  }

  // Import layouts
  for (let i = 0; i < layouts.length; i++) {
    lines.push(
      `import Layout${i} from "${fileUrl(layouts[i].filePath)}";`,
    );
  }

  // Import page component (TSX only)
  if (page.type === "tsx") {
    lines.push(`import Page from "${fileUrl(page.filePath)}";`);
  }

  lines.push("");

  // Read serialized data
  lines.push('const dataEl = document.getElementById("__TABI_DATA__");');
  lines.push('const data = JSON.parse(dataEl?.textContent ?? "{}");');
  lines.push("");

  // Generate App component
  lines.push("function App() {");
  lines.push("  return (");

  // Build nested JSX tree
  const indent = "    ";
  let currentIndent = indent;

  // Open FrontmatterProvider
  lines.push(
    `${currentIndent}<FrontmatterProvider frontmatter={data.frontmatter}>`,
  );
  currentIndent += "  ";

  // Open layouts (root to innermost)
  for (let i = 0; i < layouts.length; i++) {
    lines.push(`${currentIndent}<Layout${i}>`);
    currentIndent += "  ";
  }

  // Page content
  if (page.type === "tsx") {
    lines.push(`${currentIndent}<Page />`);
  } else {
    lines.push(`${currentIndent}<Markdown />`);
  }

  // Close layouts (innermost to root)
  for (let i = layouts.length - 1; i >= 0; i--) {
    currentIndent = currentIndent.slice(0, -2);
    lines.push(`${currentIndent}</Layout${i}>`);
  }

  // Close FrontmatterProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</FrontmatterProvider>`);

  lines.push("  );");
  lines.push("}");
  lines.push("");

  // Hydrate
  lines.push('hydrate(<App />, document.getElementById("__tabi__")!);');
  lines.push("");

  return lines.join("\n");
}

/**
 * Convert an absolute file path to a file:// URL with proper escaping.
 *
 * Escapes characters that could break out of JavaScript string literals
 * to prevent code injection via malicious file paths.
 */
function fileUrl(filePath: string): string {
  const escaped = filePath
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
  return `file://${escaped}`;
}

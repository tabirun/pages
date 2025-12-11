/**
 * SSR entry code generator for development mode.
 *
 * Generates TypeScript/TSX code that can be bundled and executed
 * to render a page server-side with the proper provider hierarchy
 * and layout chain.
 *
 * @module
 */

import type { LayoutEntry, PageEntry } from "../scanner/types.ts";
import { escapePathForJs } from "../utils/js.ts";

/**
 * Options for generating SSR entry code.
 */
export interface SSREntryOptions {
  /** Page entry to render. */
  page: PageEntry;
  /** Layout chain from root to innermost. */
  layouts: LayoutEntry[];
  /** Absolute path to framework's preact directory. */
  preactDir: string;
  /** Base path prefix for the site (e.g., "/docs"). */
  basePath?: string;
}

/**
 * Generates SSR entry code for a page.
 *
 * Creates a virtual entry file that:
 * 1. Imports render from preact-render-to-string
 * 2. Imports context providers from the framework
 * 3. Imports all layouts in the chain
 * 4. Imports the page component (TSX) or reads markdown content
 * 5. Composes the component tree matching server-side composition
 * 6. Exports the rendered HTML and metadata
 *
 * The generated code exports:
 * - `html`: The rendered HTML string
 * - `frontmatter`: The page's frontmatter object
 * - `pageType`: "tsx" or "markdown"
 *
 * @param options - SSR entry generation options
 * @returns Generated TypeScript/JSX entry code
 *
 * @example
 * ```typescript
 * const entryCode = generateSSREntry({
 *   page: { filePath: "/project/pages/about.tsx", route: "/about", type: "tsx" },
 *   layouts: [{ filePath: "/project/pages/_layout.tsx", directory: "/project/pages" }],
 *   preactDir: "/project/preact",
 *   basePath: "/docs",
 * });
 * // Use entryCode as esbuild stdin content
 * ```
 */
export function generateSSREntry(options: SSREntryOptions): string {
  const { page, layouts, preactDir, basePath = "" } = options;

  if (page.type === "tsx") {
    return generateTsxEntry(page, layouts, preactDir, basePath);
  } else {
    return generateMarkdownEntry(page, layouts, preactDir, basePath);
  }
}

/**
 * Generates SSR entry code for a TSX page.
 */
function generateTsxEntry(
  page: PageEntry,
  layouts: LayoutEntry[],
  preactDir: string,
  basePath: string,
): string {
  const lines: string[] = [];

  // Imports
  lines.push('import { render } from "preact-render-to-string";');
  lines.push(
    `import { BasePathProvider, FrontmatterProvider } from "${
      escapePathForJs(preactDir)
    }/context.tsx";`,
  );
  lines.push(
    `import { MarkdownCacheProvider } from "${
      escapePathForJs(preactDir)
    }/markdown-cache.tsx";`,
  );

  // Import layouts
  for (let i = 0; i < layouts.length; i++) {
    lines.push(
      `import Layout${i} from "${escapePathForJs(layouts[i].filePath)}";`,
    );
  }

  // Import page with frontmatter
  lines.push(
    `import Page, { frontmatter as pageFrontmatter } from "${
      escapePathForJs(page.filePath)
    }";`,
  );

  lines.push("");

  // Generate App component
  lines.push("function App() {");
  lines.push("  return (");

  // Build nested JSX tree with providers and layouts
  const indent = "    ";
  let currentIndent = indent;

  // Open BasePathProvider
  // basePath is validated by PagesConfigSchema to only contain /[a-z0-9_-]+
  // so it's safe to use directly in JSX attributes without escaping
  lines.push(`${currentIndent}<BasePathProvider basePath="${basePath}">`);
  currentIndent += "  ";

  // Open MarkdownCacheProvider (empty for TSX pages but needed for consistency)
  lines.push(`${currentIndent}<MarkdownCacheProvider>`);
  currentIndent += "  ";

  // Open FrontmatterProvider
  lines.push(
    `${currentIndent}<FrontmatterProvider frontmatter={pageFrontmatter ?? {}}>`,
  );
  currentIndent += "  ";

  // Open layouts (root to innermost)
  for (let i = 0; i < layouts.length; i++) {
    lines.push(`${currentIndent}<Layout${i}>`);
    currentIndent += "  ";
  }

  // Page component
  lines.push(`${currentIndent}<Page />`);

  // Close layouts (innermost to root)
  for (let i = layouts.length - 1; i >= 0; i--) {
    currentIndent = currentIndent.slice(0, -2);
    lines.push(`${currentIndent}</Layout${i}>`);
  }

  // Close FrontmatterProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</FrontmatterProvider>`);

  // Close MarkdownCacheProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</MarkdownCacheProvider>`);

  // Close BasePathProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</BasePathProvider>`);

  lines.push("  );");
  lines.push("}");
  lines.push("");

  // Export rendered HTML and metadata
  lines.push("export const html = render(<App />);");
  lines.push('export const pageType = "tsx";');
  lines.push("export const frontmatter = pageFrontmatter ?? {};");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates SSR entry code for a markdown page.
 */
function generateMarkdownEntry(
  page: PageEntry,
  layouts: LayoutEntry[],
  preactDir: string,
  basePath: string,
): string {
  const lines: string[] = [];

  // Imports
  lines.push('import { render } from "preact-render-to-string";');
  lines.push(
    `import { BasePathProvider, FrontmatterProvider } from "${
      escapePathForJs(preactDir)
    }/context.tsx";`,
  );
  lines.push(
    `import { MarkdownCacheProvider } from "${
      escapePathForJs(preactDir)
    }/markdown-cache.tsx";`,
  );
  lines.push(
    `import { Markdown } from "${escapePathForJs(preactDir)}/markdown.tsx";`,
  );

  // Import layouts
  for (let i = 0; i < layouts.length; i++) {
    lines.push(
      `import Layout${i} from "${escapePathForJs(layouts[i].filePath)}";`,
    );
  }

  lines.push("");

  // Read markdown content at bundle time
  // Use Deno.readTextFileSync since this runs during build
  lines.push(
    `const markdownContent = Deno.readTextFileSync("${
      escapePathForJs(page.filePath)
    }");`,
  );
  lines.push("");

  // Extract frontmatter from markdown
  lines.push("// Parse frontmatter from markdown content");
  lines.push("let pageFrontmatter = {};");
  lines.push("let markdownBody = markdownContent;");
  lines.push('if (markdownContent.startsWith("---")) {');
  lines.push('  const endIndex = markdownContent.indexOf("---", 3);');
  lines.push("  if (endIndex !== -1) {");
  lines.push(
    "    const yamlContent = markdownContent.slice(3, endIndex).trim();",
  );
  lines.push("    markdownBody = markdownContent.slice(endIndex + 3).trim();");
  lines.push("    // Parse YAML frontmatter");
  lines.push("    const lines = yamlContent.split('\\n');");
  lines.push("    for (const line of lines) {");
  lines.push("      const colonIndex = line.indexOf(':');");
  lines.push("      if (colonIndex !== -1) {");
  lines.push("        const key = line.slice(0, colonIndex).trim();");
  lines.push("        let value = line.slice(colonIndex + 1).trim();");
  lines.push("        // Handle quoted strings");
  lines.push(
    "        if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith(\"'\") && value.endsWith(\"'\"))) {",
  );
  lines.push("          value = value.slice(1, -1);");
  lines.push("        }");
  lines.push("        // Handle booleans");
  lines.push("        if (value === 'true') pageFrontmatter[key] = true;");
  lines.push(
    "        else if (value === 'false') pageFrontmatter[key] = false;",
  );
  lines.push("        else pageFrontmatter[key] = value;");
  lines.push("      }");
  lines.push("    }");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  // Generate App component
  lines.push("function App() {");
  lines.push("  return (");

  // Build nested JSX tree with providers and layouts
  const indent = "    ";
  let currentIndent = indent;

  // Open BasePathProvider
  // basePath is validated by PagesConfigSchema to only contain /[a-z0-9_-]+
  // so it's safe to use directly in JSX attributes without escaping
  lines.push(`${currentIndent}<BasePathProvider basePath="${basePath}">`);
  currentIndent += "  ";

  // Open MarkdownCacheProvider
  lines.push(`${currentIndent}<MarkdownCacheProvider>`);
  currentIndent += "  ";

  // Open FrontmatterProvider
  lines.push(
    `${currentIndent}<FrontmatterProvider frontmatter={pageFrontmatter}>`,
  );
  currentIndent += "  ";

  // Open layouts (root to innermost)
  for (let i = 0; i < layouts.length; i++) {
    lines.push(`${currentIndent}<Layout${i}>`);
    currentIndent += "  ";
  }

  // Markdown component with content
  lines.push(`${currentIndent}<Markdown>{markdownBody}</Markdown>`);

  // Close layouts (innermost to root)
  for (let i = layouts.length - 1; i >= 0; i--) {
    currentIndent = currentIndent.slice(0, -2);
    lines.push(`${currentIndent}</Layout${i}>`);
  }

  // Close FrontmatterProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</FrontmatterProvider>`);

  // Close MarkdownCacheProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</MarkdownCacheProvider>`);

  // Close BasePathProvider
  currentIndent = currentIndent.slice(0, -2);
  lines.push(`${currentIndent}</BasePathProvider>`);

  lines.push("  );");
  lines.push("}");
  lines.push("");

  // Export rendered HTML and metadata
  lines.push("export const html = render(<App />);");
  lines.push('export const pageType = "markdown";');
  lines.push("export const frontmatter = pageFrontmatter ?? {};");
  lines.push("");

  return lines.join("\n");
}

import { Marked } from "marked";
import { getHighlighter } from "./shiki.ts";

/**
 * Escapes HTML special characters to prevent XSS.
 * Order matters: & must be replaced first to avoid double-escaping.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders markdown to HTML with Shiki syntax highlighting for code blocks.
 *
 * Security: Output is not sanitized. Raw HTML and javascript: protocols in
 * markdown will pass through. Only use with trusted input (e.g., author-controlled
 * content in a static site generator). Do not use with user-submitted content.
 *
 * @param markdown - The markdown string to render (must be from trusted source)
 * @returns The rendered HTML string (not sanitized)
 * @throws {Error} If highlighter initialization fails
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const hl = await getHighlighter();
  const marked = new Marked();

  marked.use({
    renderer: {
      code({ text, lang }) {
        try {
          return hl.codeToHtml(text, {
            lang: lang || "text",
            theme: "github-dark",
          });
        } catch {
          return `<pre><code>${escapeHtml(text)}</code></pre>`;
        }
      },
    },
  });

  return await marked.parse(markdown);
}

import { createHighlighter, type Highlighter } from "shiki";

/**
 * Default languages loaded by the highlighter.
 */
export const DEFAULT_LANGUAGES = [
  // Web
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "html",
  "css",
  "json",
  "markdown",
  // Shell
  "bash",
  "sh",
  "shell",
  "zsh",
  "fish",
  "powershell",
  // Systems
  "c",
  "cpp",
  "rust",
  "go",
  "zig",
  // JVM
  "java",
  "kotlin",
  "scala",
  // .NET
  "csharp",
  "fsharp",
  // Scripting
  "python",
  "ruby",
  "php",
  "perl",
  "lua",
  // Other
  "sql",
  "graphql",
  "yaml",
  "toml",
  "dockerfile",
  "makefile",
] as const;

/**
 * Configuration options for the highlighter.
 * Note: Theme is hard-coded to github-dark for v1.
 */
export interface HighlighterConfig {
  /** Additional languages to load beyond the defaults. */
  additionalLangs?: string[];
}

// Module-level state for singleton pattern
let highlighter: Highlighter | null = null;
let configuredLangs: readonly string[] = DEFAULT_LANGUAGES;

/**
 * Resets highlighter state. For testing only.
 * @internal
 */
export function _resetForTesting(): void {
  highlighter = null;
  configuredLangs = DEFAULT_LANGUAGES;
}

/**
 * Initializes the highlighter with optional additional languages.
 * Must be called before getHighlighter() if custom languages are needed.
 * Has no effect if called after highlighter is already initialized.
 *
 * @param config - Configuration options
 * @param config.additionalLangs - Additional languages to load beyond defaults
 */
export function configureHighlighter(config: HighlighterConfig): void {
  if (highlighter) {
    return;
  }
  if (config.additionalLangs?.length) {
    const unique = new Set([...DEFAULT_LANGUAGES, ...config.additionalLangs]);
    configuredLangs = [...unique];
  }
}

/**
 * Returns a singleton Shiki highlighter instance.
 * Lazily initializes on first call with default languages.
 * Call configureHighlighter() before first use to add custom languages.
 *
 * @throws {Error} If highlighter initialization fails
 */
export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: [...configuredLangs],
    });
  }
  return highlighter;
}

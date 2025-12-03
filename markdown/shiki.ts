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
 * Default theme for syntax highlighting.
 */
export const DEFAULT_THEME = "github-dark";

/**
 * Configuration options for the highlighter.
 */
export interface HighlighterConfig {
  /** Theme for syntax highlighting. Defaults to "github-dark". */
  theme?: string;
  /** Additional languages to load beyond the defaults. */
  additionalLangs?: string[];
}

// Module-level state for singleton pattern
let highlighter: Highlighter | null = null;
let configuredLangs: readonly string[] = DEFAULT_LANGUAGES;
let configuredTheme: string = DEFAULT_THEME;

/**
 * Resets highlighter state. For testing only.
 * @internal
 */
export function _resetShikiForTesting(): void {
  if (highlighter) {
    highlighter.dispose();
  }
  highlighter = null;
  configuredLangs = DEFAULT_LANGUAGES;
  configuredTheme = DEFAULT_THEME;
}

/**
 * Initializes the highlighter with optional theme and additional languages.
 * Must be called before getHighlighter() if custom configuration is needed.
 * Has no effect if called after highlighter is already initialized.
 *
 * @param config - Configuration options
 * @param config.theme - Theme for syntax highlighting (default: "github-dark")
 * @param config.additionalLangs - Additional languages to load beyond defaults
 */
export function configureHighlighter(config: HighlighterConfig): void {
  if (highlighter) {
    return;
  }
  if (config.theme) {
    configuredTheme = config.theme;
  }
  if (config.additionalLangs?.length) {
    const unique = new Set([...DEFAULT_LANGUAGES, ...config.additionalLangs]);
    configuredLangs = [...unique];
  }
}

/**
 * Returns the configured theme for syntax highlighting.
 */
export function getConfiguredTheme(): string {
  return configuredTheme;
}

/**
 * Returns a singleton Shiki highlighter instance.
 * Lazily initializes on first call with configured theme and languages.
 * Call configureHighlighter() before first use to customize.
 *
 * @throws {Error} If highlighter initialization fails
 */
export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: [configuredTheme],
      langs: [...configuredLangs],
    });
  }
  return highlighter;
}

import { createGenerator } from "@unocss/core";
import type { UserConfig } from "@unocss/core";
import { join } from "@std/path";
import { generateContentHash } from "../build/assets.ts";
import { scanSourceContent } from "../scanner/source-scanner.ts";
import { BuildError } from "../build/types.ts";

/** Directory for generated CSS within output directory. */
const STYLES_DIR = "__styles";

/**
 * Options for UnoCSS compilation.
 */
export interface UnoCompileOptions {
  /** Path to uno.config.ts file. */
  configPath: string;
  /** Project root directory (for scanning). */
  projectRoot: string;
  /** Output directory for built files. */
  outDir: string;
  /**
   * Base path prefix for the site (optional).
   * When set, stylesheet public paths will be prefixed.
   * @example "/docs"
   */
  basePath?: string;
}

/**
 * Result of UnoCSS compilation.
 */
export interface UnoCompileResult {
  /** Generated CSS content. */
  css: string;
  /** Path where CSS was written. */
  outputPath: string;
  /** Public URL path for the CSS file. */
  publicPath: string;
}

/**
 * Compile UnoCSS from project source files.
 *
 * Scans all source files for class usage, generates CSS,
 * and writes to output directory with content hash.
 *
 * @param options - Compilation options
 * @returns Compilation result with CSS and output paths
 * @throws {BuildError} If compilation fails
 *
 * @example
 * ```typescript
 * const result = await compileUnoCSS({
 *   configPath: "/project/uno.config.ts",
 *   projectRoot: "/project",
 *   outDir: "/project/dist",
 * });
 * // result.publicPath might be "/__styles/A1B2C3D4.css"
 * ```
 */
export async function compileUnoCSS(
  options: UnoCompileOptions,
): Promise<UnoCompileResult> {
  const { configPath, projectRoot, outDir, basePath = "" } = options;

  try {
    // Load user's UnoCSS config
    const config = await loadUnoConfig(configPath);

    // Create generator with user config
    const generator = await createGenerator(config);

    // Scan source files for classes
    const sourceContent = await scanSourceContent(projectRoot);

    // Generate CSS
    const { css } = await generator.generate(sourceContent);

    // If no CSS generated, return empty result
    if (!css || css.trim().length === 0) {
      return {
        css: "",
        outputPath: "",
        publicPath: "",
      };
    }

    // Generate content hash for filename
    const hash = await generateContentHash(new TextEncoder().encode(css));
    const filename = `${hash}.css`;

    // Write CSS file
    const stylesDir = join(outDir, STYLES_DIR);
    await Deno.mkdir(stylesDir, { recursive: true });
    const outputPath = join(stylesDir, filename);
    await Deno.writeTextFile(outputPath, css);

    return {
      css,
      outputPath,
      publicPath: `${basePath}/${STYLES_DIR}/${filename}`,
    };
  } catch (error) {
    if (error instanceof BuildError) {
      throw error;
    }
    // deno-coverage-ignore-start -- defensive handling for non-Error exceptions
    throw new BuildError(
      `UnoCSS compilation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      undefined,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }
}

/**
 * Load UnoCSS config from file.
 */
async function loadUnoConfig(configPath: string): Promise<UserConfig> {
  try {
    // Convert to file:// URL to ensure local file resolution when running from JSR
    const configUrl = configPath.startsWith("/")
      ? `file://${configPath}`
      : configPath;
    const module = await import(configUrl);
    return module.default ?? {};
  } catch (error) {
    // deno-coverage-ignore-start -- defensive handling for non-Error exceptions
    throw new BuildError(
      `Failed to load UnoCSS config from ${configPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      undefined,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }
}

/** Pattern for valid CSS public paths (defense-in-depth). Allows optional basePath prefix. */
const VALID_CSS_PATH_PATTERN = /^(\/[a-z0-9_-]+)*\/__styles\/[A-F0-9]{8}\.css$/;

/**
 * Inject UnoCSS stylesheet link into HTML.
 *
 * Adds a `<link rel="stylesheet">` tag before the closing `</head>` tag.
 *
 * @param html - HTML content to inject into
 * @param cssPublicPath - Public URL path to CSS file
 * @returns HTML with injected stylesheet link
 * @throws {Error} If cssPublicPath doesn't match expected pattern
 */
export function injectStylesheet(html: string, cssPublicPath: string): string {
  if (!cssPublicPath) {
    return html;
  }

  // Validate path format (defense-in-depth against XSS)
  if (!VALID_CSS_PATH_PATTERN.test(cssPublicPath)) {
    throw new Error(
      `Invalid CSS path format: ${cssPublicPath}. Expected pattern: [basePath]/__styles/[A-F0-9]{8}.css`,
    );
  }

  const linkTag = `<link rel="stylesheet" href="${cssPublicPath}">`;

  // Try to inject before </head>
  if (html.includes("</head>")) {
    return html.replace("</head>", `${linkTag}\n</head>`);
  }

  // Fallback: inject at start of <body> if no </head>
  if (html.includes("<body")) {
    return html.replace(/<body([^>]*)>/, `<body$1>\n${linkTag}`);
  }

  // Last resort: prepend to document
  return linkTag + "\n" + html;
}

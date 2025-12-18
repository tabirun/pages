import { join } from "@std/path";
import { generateContentHash } from "../build/assets.ts";
import { BuildError } from "../build/types.ts";

/** Directory for generated CSS within output directory. */
const STYLES_DIR = "__styles";

/**
 * Options for CSS compilation.
 */
export interface CSSCompileOptions {
  /** Path to CSS entry file. */
  entryPath: string;
  /** Path to postcss.config.ts file. */
  configPath: string;
  /** Output directory for built files. */
  outDir: string;
  /**
   * Base path prefix for the site (optional).
   * When set, stylesheet public paths will be prefixed.
   * @example "/docs"
   */
  basePath?: string;
  /**
   * Path to project's deno.json (optional).
   * When provided, runs PostCSS compilation in a subprocess
   * with --config to resolve project dependencies.
   */
  projectConfig?: string;
}

/**
 * Result of CSS compilation.
 */
export interface CSSCompileResult {
  /** Generated CSS content. */
  css: string;
  /** Path where CSS was written. */
  outputPath: string;
  /** Public URL path for the CSS file. */
  publicPath: string;
}

/**
 * Compile CSS using PostCSS from entry file.
 *
 * Processes the entry CSS file through PostCSS using the project's
 * postcss.config.ts, then writes output to the output directory with
 * content hash.
 *
 * @param options - Compilation options
 * @returns Compilation result with CSS and output paths
 * @throws {BuildError} If compilation fails
 *
 * @example
 * ```typescript
 * const result = await compileCSS({
 *   entryPath: "/project/styles/index.css",
 *   configPath: "/project/postcss.config.ts",
 *   outDir: "/project/dist",
 * });
 * // result.publicPath might be "/__styles/A1B2C3D4.css"
 * ```
 */
export async function compileCSS(
  options: CSSCompileOptions,
): Promise<CSSCompileResult> {
  const { entryPath, configPath, outDir, basePath = "", projectConfig } =
    options;

  try {
    // Generate CSS via subprocess to use project's PostCSS plugins
    const css = await compileInSubprocess(
      entryPath,
      configPath,
      projectConfig,
    );

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
      `CSS compilation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      undefined,
      { cause: error instanceof Error ? error : undefined },
    );
    // deno-coverage-ignore-stop
  }
}

/**
 * Inline subprocess code for PostCSS compilation.
 * Written to temp file when running from JSR to ensure --config is respected.
 */
const SUBPROCESS_CODE = `
const args = Deno.args;
if (args.length < 2) {
  console.log(JSON.stringify({ success: false, error: "Usage: subprocess.ts <entryPath> <configPath>" }));
  Deno.exit(1);
}
const [entryPath, configPath] = args;
try {
  const cssContent = await Deno.readTextFile(entryPath);
  const configUrl = configPath.startsWith("/") ? "file://" + configPath : configPath;
  const configModule = await import(configUrl);
  const config = configModule.default ?? {};
  const postcss = await import("postcss");
  const processor = postcss.default(config.plugins ?? []);
  const result = await processor.process(cssContent, { from: entryPath });
  console.log(JSON.stringify({ success: true, css: result.css }));
} catch (err) {
  console.log(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }));
  Deno.exit(1);
}
`;

/**
 * Compile CSS in a subprocess with project's import map.
 * This allows resolving project dependencies (PostCSS plugins) without
 * affecting other dependency resolution in the main process.
 */
async function compileInSubprocess(
  entryPath: string,
  configPath: string,
  projectConfig?: string,
): Promise<string> {
  const subprocessUrl = new URL("./subprocess.ts", import.meta.url);
  const isRemote = subprocessUrl.protocol !== "file:";

  // When running from JSR, write subprocess to temp file so --config is respected
  let subprocessPath: string;
  if (isRemote) {
    const tempFile = await Deno.makeTempFile({ suffix: ".ts" });
    await Deno.writeTextFile(tempFile, SUBPROCESS_CODE);
    subprocessPath = tempFile;
  } else {
    subprocessPath = subprocessUrl.pathname;
  }

  const args = [
    "run",
    "-A",
  ];

  // Use project config if provided for dependency resolution
  if (projectConfig) {
    args.push(`--config=${projectConfig}`);
  }

  args.push(subprocessPath, entryPath, configPath);

  const command = new Deno.Command("deno", {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  const stdoutText = new TextDecoder().decode(stdout);
  const stderrText = new TextDecoder().decode(stderr);

  if (code !== 0) {
    // Try to parse JSON error from stdout
    try {
      const result = JSON.parse(stdoutText) as {
        success: false;
        error: string;
      };
      throw new BuildError(
        `CSS compilation failed: ${result.error}`,
        undefined,
      );
    } catch (parseError) {
      if (parseError instanceof BuildError) {
        throw parseError;
      }
      throw new BuildError(
        `CSS compilation failed: ${stderrText || `exit code ${code}`}`,
        undefined,
      );
    }
  }

  try {
    const result = JSON.parse(stdoutText) as { success: true; css: string };
    return result.css;
  } catch (parseError) {
    if (parseError instanceof BuildError) {
      throw parseError;
    }
    throw new BuildError(
      `Failed to parse CSS subprocess output: ${stdoutText}`,
      undefined,
    );
  }
}

/** Pattern for valid CSS public paths (defense-in-depth). Allows optional basePath prefix. */
const VALID_CSS_PATH_PATTERN = /^(\/[a-z0-9_-]+)*\/__styles\/[A-F0-9]{8}\.css$/;

/**
 * Inject CSS stylesheet link into HTML.
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

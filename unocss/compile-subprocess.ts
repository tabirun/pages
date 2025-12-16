/**
 * Subprocess for UnoCSS compilation with project's import map.
 *
 * This runs in a subprocess with --config to access the project's dependencies
 * (like @unocss/preset-typography) without affecting preact version resolution
 * in the main build process.
 *
 * Usage: deno run -A --config=<projectConfig> unocss/compile-subprocess.ts <configPath> <projectRoot>
 *
 * Output (JSON to stdout):
 * Success: { success: true, css: string }
 * Error: { success: false, error: string }
 */

import { createGenerator } from "@unocss/core";
import { scanSourceContent } from "../scanner/source-scanner.ts";

interface CompileResult {
  success: true;
  css: string;
}

interface CompileError {
  success: false;
  error: string;
}

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length < 2) {
    const error: CompileError = {
      success: false,
      error:
        "Usage: deno run -A --config=<projectConfig> compile-subprocess.ts <configPath> <projectRoot>",
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }

  const [configPath, projectRoot] = args;

  try {
    // Load config - this works because subprocess has --config with project's import map
    const configUrl = configPath.startsWith("/")
      ? `file://${configPath}`
      : configPath;
    const module = await import(configUrl);
    const config = module.default ?? {};

    // Create generator
    const generator = await createGenerator(config);

    // Scan source files
    const sourceContent = await scanSourceContent(projectRoot);

    // Generate CSS
    const { css } = await generator.generate(sourceContent);

    const result: CompileResult = {
      success: true,
      css: css ?? "",
    };
    console.log(JSON.stringify(result));
  } catch (err) {
    const error: CompileError = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }
}

main();

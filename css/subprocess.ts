// deno-coverage-ignore-file -- subprocess runs in separate Deno process, cannot be instrumented

/**
 * Subprocess for PostCSS compilation with project's import map.
 *
 * This runs in a subprocess with --config to access the project's dependencies
 * (like postcss plugins) without affecting other dependency resolution
 * in the main build process.
 *
 * Usage: deno run -A [--config=<projectConfig>] css/subprocess.ts <entryPath> <configPath>
 *
 * Output (JSON to stdout):
 * Success: { success: true, css: string }
 * Error: { success: false, error: string }
 */

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
        "Usage: deno run -A [--config=<projectConfig>] subprocess.ts <entryPath> <configPath>",
    };
    console.log(JSON.stringify(error));
    Deno.exit(1);
  }

  const [entryPath, configPath] = args;

  try {
    // Read the CSS entry file
    const cssContent = await Deno.readTextFile(entryPath);

    // Load postcss config
    const configUrl = configPath.startsWith("/")
      ? `file://${configPath}`
      : configPath;
    const configModule = await import(configUrl);
    const config = configModule.default ?? {};

    // Load PostCSS from project's dependencies
    // This relies on the subprocess being run with --config pointing to the project's deno.json
    const postcss = await import("postcss");
    const postcssProcessor = postcss.default;

    // Get plugins from config
    const plugins = config.plugins ?? [];

    // Create processor with plugins
    const processor = postcssProcessor(plugins);

    // Process CSS
    const processResult = await processor.process(cssContent, {
      from: entryPath,
    });

    const result: CompileResult = {
      success: true,
      css: processResult.css,
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

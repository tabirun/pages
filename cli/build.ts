#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { isAbsolute } from "@std/path";
import { parseArgs } from "./args.ts";
import { handleError } from "./error.ts";
import { printHelp } from "./help.ts";
import type { CliCommand, CliOption } from "./types.ts";
import { pages } from "../pages/mod.ts";
import { logger } from "../utils/logger.ts";

/**
 * Validate that a path is safe (no traversal, relative only).
 */
function validatePath(path: string, name: string): void {
  if (path.includes("..")) {
    throw new Error(
      `${name} must not contain '..' path traversal sequences`,
    );
  }
  if (isAbsolute(path)) {
    throw new Error(`${name} must be a relative path within the project`);
  }
}

const buildOptions: CliOption[] = [
  {
    short: "p",
    long: "pages-dir",
    description: "Directory containing page files",
    default: "./pages",
  },
  {
    short: "o",
    long: "out-dir",
    description: "Output directory for built files",
    default: "./dist",
  },
  {
    long: "base-path",
    description: "Base path for hosting at a subpath (e.g., /docs)",
  },
  {
    long: "base-url",
    description: "Base URL for sitemap generation (e.g., https://example.com)",
  },
];

const buildCommand: CliCommand = {
  name: "build",
  description: "Build a static site from your pages.",
  usage:
    "deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build [OPTIONS]",
  options: buildOptions,
  permissions: "--allow-read --allow-write --allow-env --allow-run",
  examples: [
    "deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build",
    "deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build --out-dir ./public",
    "deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build --base-path /docs",
    "deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build --base-url https://example.com",
  ],
};

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, buildOptions);

  if (args.help) {
    printHelp(buildCommand);
    return;
  }

  const pagesDir = args.values["pages-dir"];
  const outDir = args.values["out-dir"];
  const basePath = args.values["base-path"];
  const baseUrl = args.values["base-url"];

  // Validate paths at CLI boundary to prevent path traversal
  validatePath(pagesDir, "--pages-dir");
  validatePath(outDir, "--out-dir");

  const config: { basePath?: string; siteMetadata?: { baseUrl: string } } = {};

  if (basePath) {
    config.basePath = basePath;
  }

  if (baseUrl) {
    config.siteMetadata = { baseUrl };
  }

  const { build } = pages(config);

  logger.info(`Building site from ${pagesDir} to ${outDir}...`);

  await build({
    pagesDir,
    outDir,
  });

  logger.success("Build complete!");
}

// deno-coverage-ignore-start: Entry point guard cannot be tested when module is imported
if (import.meta.main) {
  main().catch(handleError);
}
// deno-coverage-ignore-end

export { buildCommand, buildOptions, main };

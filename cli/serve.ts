#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { isAbsolute } from "@std/path";
import { TabiApp } from "@tabirun/app";
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

const serveOptions: CliOption[] = [
  {
    short: "d",
    long: "dir",
    description: "Directory containing built files to serve",
    default: "./dist",
  },
  {
    short: "p",
    long: "port",
    description: "Port to listen on",
    default: "3000",
  },
  {
    long: "base-path",
    description: "Base path for hosting at a subpath (e.g., /docs)",
  },
];

const serveCommand: CliCommand = {
  name: "serve",
  description: "Serve a pre-built static site.",
  usage:
    "deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve [OPTIONS]",
  options: serveOptions,
  permissions: "--allow-net --allow-read --allow-env",
  examples: [
    "deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve",
    "deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve --port 8080",
    "deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve --dir ./public",
    "deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve --base-path /docs",
  ],
};

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, serveOptions);

  if (args.help) {
    printHelp(serveCommand);
    return;
  }

  const dir = args.values["dir"];
  const portStr = args.values["port"];
  const basePath = args.values["base-path"];

  // Validate dir path
  validatePath(dir, "--dir");

  // Parse and validate port
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port: ${portStr}. Must be a number between 1 and 65535.`,
    );
  }

  const config: { basePath?: string } = {};
  if (basePath) {
    config.basePath = basePath;
  }

  const app = new TabiApp();
  const { serve } = pages(config);

  serve(app, { dir });

  // Setup graceful shutdown
  const abortController = new AbortController();

  const shutdown = () => {
    logger.info("Shutting down...");
    abortController.abort();
  };

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);

  logger.info(`Serving ${dir} at http://localhost:${port}`);

  try {
    const server = Deno.serve(
      { port, signal: abortController.signal },
      app.handler,
    );

    await server.finished;
    // deno-coverage-ignore-start: Error handling for port conflicts and unexpected errors
    // Testing AddrInUse requires race conditions; re-throw branch requires unexpected server errors
  } catch (error) {
    if (error instanceof Deno.errors.AddrInUse) {
      throw new Error(
        `Port ${port} is already in use. Try a different port with --port.`,
      );
    }
    throw error;
    // deno-coverage-ignore-end
  } finally {
    Deno.removeSignalListener("SIGINT", shutdown);
    Deno.removeSignalListener("SIGTERM", shutdown);
  }
}

// deno-coverage-ignore-start: Entry point guard cannot be tested when module is imported
if (import.meta.main) {
  main().catch(handleError);
}
// deno-coverage-ignore-end

export { main, serveCommand, serveOptions };

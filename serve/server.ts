/**
 * Static server for pages module.
 *
 * Serves pre-built static files from dist directory.
 *
 * @module
 */

import { join } from "@std/path";
import type { TabiApp } from "@tabirun/app";
import { serveFiles } from "@tabirun/app/serve-files";
import type { StaticServerOptions } from "./types.ts";

/**
 * Registers static server routes for pre-built files.
 *
 * Behavior:
 * - Serves pre-built HTML files from dist/
 * - Serves hashed assets from dist/__tabi/ and dist/__styles/
 * - Falls back to _not-found.html if it exists
 * - No building, watching, or rendering
 * - Production serving mode
 *
 * Uses the serveFiles middleware for all file serving.
 *
 * @param app Tabi application instance
 * @param options Static server configuration
 */
export function registerStaticServer(
  app: TabiApp,
  options: StaticServerOptions = {},
): void {
  const rootDir = options.rootDir ?? "./";

  // Pre-load _not-found.html at startup to avoid blocking on 404 errors
  const notFoundPath = join(rootDir, "_not-found.html");
  let notFoundHtml: string | null = null;
  try {
    notFoundHtml = Deno.readTextFileSync(notFoundPath);
  } catch {
    // _not-found.html doesn't exist, will use default notFound
  }

  app.get(
    "/*",
    serveFiles({
      directory: rootDir,
      serveIndex: true,
      onNotFound: (c) => {
        if (notFoundHtml) {
          c.html(notFoundHtml, 404);
        } else {
          c.notFound();
        }
      },
    }),
  );
}

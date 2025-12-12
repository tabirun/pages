/**
 * Dev server registration and orchestration.
 *
 * Registers routes for hot reload, page requests, and public assets.
 * Sets up file watching with manifest invalidation for live updates.
 *
 * @module
 */

import { dirname, fromFileUrl, join, resolve } from "@std/path";
import type { TabiApp } from "@tabirun/app";
import { serveFiles } from "@tabirun/app/serve-files";
import { scanPages } from "../scanner/scanner.ts";
import { watchPages } from "../scanner/watcher.ts";
import type { FileChangeEvent } from "../scanner/types.ts";
import { createHotReloadServer } from "./hot-reload.ts";
import { handleNotFound, handlePageRequest } from "./handlers.ts";
import type {
  DevServerCleanup,
  DevServerOptions,
  DevServerState,
} from "./types.ts";

/** Absolute path to framework's preact directory. */
const PREACT_DIR = join(
  dirname(fromFileUrl(import.meta.url)),
  "../preact",
);

/**
 * Registers the development server on a TabiApp instance.
 *
 * This function sets up:
 * 1. WebSocket endpoint for hot reload (`{basePath}/__hot-reload`)
 * 2. Public asset serving (`{basePath}/*` for files in publicDir)
 * 3. Page request handling (`{basePath}/*` catch-all)
 * 4. File watching with manifest invalidation
 *
 * File changes trigger:
 * - Page/code changes: Manifest invalidation + reload broadcast
 * - Layout/system changes: Manifest invalidation + reload broadcast
 * - Public asset changes: Reload broadcast only
 * - UnoCSS config changes: Reload broadcast only
 *
 * @param app - TabiApp instance to register routes on
 * @param options - Dev server configuration
 * @returns Cleanup function to stop watching and close connections
 *
 * @example
 * ```typescript
 * import { TabiApp } from "@tabirun/app";
 * import { registerDevServer } from "./dev/server.ts";
 *
 * const app = new TabiApp();
 * const cleanup = await registerDevServer(app, {
 *   rootDir: "/path/to/project",
 *   basePath: "/docs",
 * });
 *
 * // On shutdown:
 * cleanup();
 * ```
 */
export async function registerDevServer(
  app: TabiApp,
  options: DevServerOptions,
): Promise<DevServerCleanup> {
  const rootDir = resolve(options.rootDir);
  const pagesDir = options.pagesDir ?? "pages";
  const publicDir = options.publicDir ?? "public";
  const basePath = options.basePath ?? "";

  // Initialize state
  const state: DevServerState = {
    manifest: null,
    hotReload: createHotReloadServer(),
    watchHandle: null,
    rootDir,
    pagesDir,
    publicDir,
    basePath,
    preactDir: PREACT_DIR,
  };

  // Initial manifest scan
  state.manifest = await scanPages({
    rootDir,
    pagesDir,
    publicDir,
  });

  // Set up file watching
  state.watchHandle = watchPages(
    { rootDir, pagesDir, publicDir },
    (event: FileChangeEvent) => handleFileChange(event, state),
  );

  // Register routes (order matters - specific routes first)

  // 1. Hot reload WebSocket endpoint
  const hotReloadPath = basePath ? `${basePath}/__hot-reload` : "/__hot-reload";
  app.get(hotReloadPath, (c) => {
    c.webSocket((socket: WebSocket) => {
      state.hotReload.handleConnection(socket);
    });
  });

  // 2. Public asset serving (only if publicDir exists)
  const publicDirPath = join(rootDir, publicDir);
  try {
    const stat = Deno.statSync(publicDirPath);
    if (stat.isDirectory) {
      // Serve public assets without basePath prefix in the URL
      // e.g., /favicon.ico serves from public/favicon.ico
      const publicPattern = basePath ? `${basePath}/*` : "/*";
      app.get(
        publicPattern,
        serveFiles({
          directory: publicDirPath,
          serveIndex: false,
          // Don't handle 404 - let it fall through to page handler
        }),
      );
    }
  } catch {
    // Public directory doesn't exist - skip
  }

  // 3. Page request catch-all
  const pagePattern = basePath ? `${basePath}/*` : "/*";
  app.get(pagePattern, async (c) => {
    // Extract route from request URL
    const url = new URL(c.req.url);
    let route = url.pathname;

    // Strip basePath prefix
    if (basePath && route.startsWith(basePath)) {
      route = route.slice(basePath.length) || "/";
    }

    // Normalize route (remove trailing slash except for root)
    if (route !== "/" && route.endsWith("/")) {
      route = route.slice(0, -1);
    }

    const result = await handlePageRequest(route, state);
    c.html(result.html, result.status);
  });

  // 4. Handle root path explicitly if basePath is set
  if (basePath) {
    app.get(basePath, async (c) => {
      const result = await handlePageRequest("/", state);
      c.html(result.html, result.status);
    });

    // 404 for requests outside basePath
    app.get("/*", async (c) => {
      const result = await handleNotFound(state);
      c.html(result.html, result.status);
    });
  }

  // Return cleanup function
  return () => {
    state.watchHandle?.stop();
    state.hotReload.close();
  };
}

/**
 * Handles a file change event.
 *
 * Determines whether to invalidate the manifest and broadcasts
 * reload to connected clients.
 *
 * Manifest is invalidated for:
 * - Layout changes (affects layout chains)
 * - System file changes (_html, _not-found, _error)
 * - Code changes outside pages/ (could affect any importer)
 * - Page create/delete (structural change)
 *
 * Manifest is NOT invalidated for:
 * - Page content updates (only affects that page)
 * - Public asset changes (no impact on manifest)
 * - UnoCSS config changes (rebuild CSS, don't rescan)
 */
function handleFileChange(event: FileChangeEvent, state: DevServerState): void {
  // Page updates don't require manifest invalidation - only create/delete do
  const isPageStructuralChange = event.category === "page" &&
    (event.type === "create" || event.type === "delete");

  const shouldInvalidateManifest = event.category === "layout" ||
    event.category === "system" ||
    event.category === "code" ||
    isPageStructuralChange;

  if (shouldInvalidateManifest) {
    // Invalidate manifest - will be rescanned on next request
    state.manifest = null;

    // Trigger async rescan
    scanPages({
      rootDir: state.rootDir,
      pagesDir: state.pagesDir,
      publicDir: state.publicDir,
    }).then((manifest) => {
      state.manifest = manifest;
      state.hotReload.reload();
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      state.hotReload.sendError(message, stack);
    });
  } else {
    // Just broadcast reload (e.g., public asset update, UnoCSS config)
    state.hotReload.reload();
  }
}

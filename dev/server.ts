/**
 * Development server for pages module.
 *
 * Serves pages with hot reload via SSR bundling.
 * Uses esbuild to bundle fresh components, bypassing Deno's module cache.
 *
 * @module
 */

import { dirname, join, resolve } from "@std/path";
import type { TabiApp, TabiContext } from "@tabirun/app";
import { serveFiles } from "@tabirun/app/serve-files";
import { scanPages } from "../scanner/scanner.ts";
import { watchPages } from "../scanner/watcher.ts";
import type { PageManifest, WatchHandle } from "../scanner/types.ts";
import { escapeHtml } from "../utils/html.ts";
import { logger } from "../utils/logger.ts";
import { bundleSSR, stopSSRBundler } from "../bundler/ssr.ts";
import { bundleClient, stopEsbuild } from "../bundler/client.ts";
import { renderPage } from "../renderer/renderer.tsx";
import { loadDocument } from "../loaders/html-loader.ts";
import { compileCSS, injectStylesheet } from "../css/compiler.ts";

/**
 * Options for the development server.
 */
export interface DevServerOptions {
  /** Directory containing page files. Defaults to "./pages". */
  pagesDir?: string;
  /** Base path prefix for the site. */
  basePath?: string;
  /** CSS class name(s) to apply to markdown wrapper divs. */
  markdownClassName?: string;
  /**
   * CSS entry file path (relative to project root).
   * Required when postcss.config.ts exists for CSS processing.
   * @example "./styles/index.css"
   */
  cssEntry?: string;
}

/**
 * WebSocket message types for HMR.
 */
type HMRMessage = { type: "reload" };

/**
 * Build result from page building.
 */
interface BuildResult {
  success: true;
  html: string;
  bundlePublicPath: string;
  cssPublicPath?: string;
}

interface BuildError {
  success: false;
  error: string;
  stack?: string;
}

type BuildOutput = BuildResult | BuildError;

/**
 * State for the dev server.
 */
interface DevServerState {
  pagesDir: string;
  basePath: string;
  outDir: string;
  projectRoot: string;
  manifest: PageManifest;
  wsClients: Set<WebSocket>;
  watchHandle: WatchHandle | null;
  markdownClassName?: string;
  cssEntry?: string;
}

/**
 * Handle returned by registerDevServer for cleanup.
 */
export interface DevServerHandle {
  /** Stop the dev server and clean up resources. */
  stop(): Promise<void>;
}

/**
 * Registers development server routes.
 *
 * Behavior:
 * - Serves pages by building on-demand via SSR bundling
 * - WebSocket endpoint for hot reload notifications
 * - Serves client bundles from .tabi directory
 * - Serves public assets from public directory
 * - File watcher broadcasts reload on any change
 *
 * @param app Tabi application instance
 * @param options Dev server configuration
 * @returns Handle to stop the dev server
 */
export async function registerDevServer(
  app: TabiApp,
  options: DevServerOptions = {},
): Promise<DevServerHandle> {
  const pagesDir = resolve(options.pagesDir ?? "./pages");
  const basePath = options.basePath ?? "";
  const markdownClassName = options.markdownClassName;
  const cssEntry = options.cssEntry;
  const projectRoot = dirname(pagesDir);
  const publicDir = join(projectRoot, "public");
  const outDir = join(projectRoot, ".tabi");

  // Create .tabi directory for dev builds
  try {
    await Deno.mkdir(outDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  // Initial scan
  const manifest = await scanPages({
    rootDir: projectRoot,
    pagesDir: "pages",
  });

  // Server state
  const state: DevServerState = {
    pagesDir,
    basePath,
    outDir,
    projectRoot,
    manifest,
    wsClients: new Set(),
    watchHandle: null,
    markdownClassName,
    cssEntry,
  };

  // Start file watcher
  state.watchHandle = watchPages(
    { rootDir: projectRoot },
    (_event) => {
      // Rescan manifest on file change
      scanPages({ rootDir: projectRoot, pagesDir: "pages" })
        .then((newManifest) => {
          state.manifest = newManifest;
        })
        .catch((err) => {
          logger.error(`Failed to rescan pages: ${err.message}`);
        });

      // Broadcast reload to all clients
      broadcastReload(state.wsClients);
    },
  );

  logger.info(`Watching for changes in ${projectRoot}`);

  // Register WebSocket endpoint for HMR
  const wsPattern = basePath ? `${basePath}/__dev` : "/__dev";
  app.get(wsPattern, (c) => {
    c.webSocket((socket) => {
      state.wsClients.add(socket);

      socket.onclose = () => {
        state.wsClients.delete(socket);
      };

      socket.onerror = () => {
        state.wsClients.delete(socket);
      };
    });
  });

  // Serve bundles from .tabi directory
  const bundlePattern = basePath ? `${basePath}/__tabi/*` : "/__tabi/*";
  app.get(bundlePattern, async (c) => {
    const pathname = c.req.url.pathname;
    const bundlePath = basePath
      ? pathname.slice(basePath.length + "/__tabi/".length)
      : pathname.slice("/__tabi/".length);

    // Prevent path traversal
    if (bundlePath.includes("..")) {
      c.notFound();
      return;
    }

    const filePath = resolve(join(outDir, "__tabi", bundlePath));

    // Ensure resolved path is still within outDir
    if (!filePath.startsWith(outDir + "/")) {
      c.notFound();
      return;
    }

    try {
      await c.file(filePath);
    } catch {
      c.notFound();
    }
  });

  // Serve CSS from .tabi directory
  const stylesPattern = basePath ? `${basePath}/__styles/*` : "/__styles/*";
  app.get(stylesPattern, async (c) => {
    const pathname = c.req.url.pathname;
    const stylePath = basePath
      ? pathname.slice(basePath.length + "/__styles/".length)
      : pathname.slice("/__styles/".length);

    // Prevent path traversal
    if (stylePath.includes("..")) {
      c.notFound();
      return;
    }

    const filePath = resolve(join(outDir, "__styles", stylePath));

    // Ensure resolved path is still within outDir
    if (!filePath.startsWith(outDir + "/")) {
      c.notFound();
      return;
    }

    try {
      await c.file(filePath);
    } catch {
      c.notFound();
    }
  });

  // Combined public assets + page handler (can't register same route twice)
  // MUST be registered last - catches all routes not matched by specific handlers above
  const publicPattern = basePath ? `${basePath}/*` : "/*";
  app.get(
    publicPattern,
    serveFiles({
      directory: publicDir,
      serveIndex: false,
      onNotFound: async (c) => {
        // Public asset not found, try handling as page request
        await handlePageRequest(c, state);
      },
    }),
  );

  // Return cleanup handle
  return {
    async stop() {
      // Stop file watcher
      if (state.watchHandle) {
        state.watchHandle.stop();
        state.watchHandle = null;
      }

      // Close all WebSocket clients
      for (const client of state.wsClients) {
        try {
          client.close();
        } catch {
          // Ignore errors on close
        }
      }
      state.wsClients.clear();

      // Stop esbuild services
      await Promise.all([stopSSRBundler(), stopEsbuild()]);

      // Clean up .tabi directory
      try {
        await Deno.remove(state.outDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }

      logger.info("Dev server stopped");
    },
  };
}

/**
 * Handle a page request by building via SSR bundling.
 */
async function handlePageRequest(
  c: TabiContext,
  state: DevServerState,
): Promise<void> {
  const startTime = performance.now();
  const { basePath, manifest } = state;

  // Get route from request path
  let route = c.req.url.pathname;
  if (basePath && route.startsWith(basePath)) {
    route = route.slice(basePath.length) || "/";
  }

  // Normalize route (remove trailing slash except for root)
  if (route !== "/" && route.endsWith("/")) {
    route = route.slice(0, -1);
  }

  // Check if page exists
  const pageEntry = manifest.pages.find((p) => p.route === route);

  if (!pageEntry) {
    // Try to build custom 404 page if it exists
    const notFoundEntry = manifest.pages.find((p) => p.route === "/_not-found");
    if (notFoundEntry) {
      const result = await buildPage(
        notFoundEntry,
        state,
      );

      if (result.success) {
        const html = injectHmrScript(result.html, basePath);
        c.html(html, 404);
        return;
      }
    }

    const notFoundHtml = injectHmrScript(
      renderErrorPage("Page Not Found", `No page found for route: ${route}`),
      basePath,
    );
    c.html(notFoundHtml, 404);
    return;
  }

  // Build page
  const result = await buildPage(pageEntry, state);

  if (!result.success) {
    const errorHtml = injectHmrScript(
      renderErrorPage("Build Error", result.error, result.stack),
      basePath,
    );
    c.html(errorHtml, 500);
    logger.ephemeral.error(`Error rendering ${route}: ${result.error}`);
    return;
  }

  // Inject HMR script and respond
  const html = injectHmrScript(result.html, basePath);
  c.html(html);

  // Log rendered page (ephemeral - overwrites previous line)
  const duration = Math.round(performance.now() - startTime);
  logger.ephemeral.info(`Rendered ${route} (${duration}ms)`);
}

/**
 * Find the nearest deno.json by walking up from a directory.
 */
async function findDenoConfig(startDir: string): Promise<string | null> {
  let dir = startDir;
  const root = "/";

  while (dir !== root) {
    const configPath = join(dir, "deno.json");
    try {
      const stat = await Deno.stat(configPath);
      if (stat.isFile) {
        return configPath;
      }
    } catch {
      // File doesn't exist, try parent
    }
    dir = dirname(dir);
  }

  return null;
}

/**
 * Build a page using SSR bundling.
 */
async function buildPage(
  pageEntry: {
    route: string;
    filePath: string;
    type: "tsx" | "markdown";
    layoutChain: string[];
  },
  state: DevServerState,
): Promise<BuildOutput> {
  const {
    pagesDir,
    basePath,
    outDir,
    projectRoot,
    manifest,
    markdownClassName,
    cssEntry,
  } = state;

  try {
    // Bundle page and layouts for SSR
    const { page, layouts } = await bundleSSR({
      pageEntry,
      outDir,
      projectRoot,
    });

    // Load custom document template if _html.tsx exists
    // Note: document is cached by Deno's import, but it's typically static
    // and users rarely edit it during dev. If caching becomes an issue,
    // we can add document to SSR bundle.
    const documentComponent = manifest.systemFiles.html
      ? (await loadDocument(manifest.systemFiles.html)).component
      : undefined;

    // Bundle client JS
    const bundleResult = await bundleClient({
      page,
      layouts,
      route: pageEntry.route,
      outDir: join(outDir, "__tabi"),
      mode: "development",
      projectRoot,
      basePath,
    });

    // Render to HTML
    const { html: rawHtml } = await renderPage({
      page,
      layouts,
      clientBundlePath: bundleResult.publicPath,
      route: pageEntry.route,
      document: documentComponent,
      basePath,
      markdownClassName,
    });

    // Compile CSS if config and entry exist
    let html = rawHtml;
    let cssPublicPath: string | undefined;

    const projectConfig = await findDenoConfig(pagesDir);

    if (manifest.systemFiles.postcssConfig && cssEntry) {
      const entryPath = join(projectRoot, cssEntry);
      const cssResult = await compileCSS({
        entryPath,
        configPath: manifest.systemFiles.postcssConfig,
        outDir,
        basePath,
        projectConfig: projectConfig ?? undefined,
      });

      if (cssResult.css) {
        html = injectStylesheet(html, cssResult.publicPath);
        cssPublicPath = cssResult.publicPath;
      }
    }

    return {
      success: true,
      html,
      bundlePublicPath: bundleResult.publicPath,
      cssPublicPath,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    };
  }
}

/**
 * Inject HMR client script into HTML.
 */
function injectHmrScript(html: string, basePath: string): string {
  const wsPath = basePath ? `${basePath}/__dev` : "/__dev";

  const script = `<script>
(function() {
  var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  var ws = new WebSocket(protocol + '//' + location.host + '${wsPath}');

  ws.onmessage = function(e) {
    var msg = JSON.parse(e.data);
    if (msg.type === 'reload') {
      location.reload();
    }
  };

  ws.onclose = function() {
    setTimeout(function() { location.reload(); }, 1000);
  };
})();
</script>`;

  // Inject before last </body>
  const lastBodyIndex = html.lastIndexOf("</body>");
  if (lastBodyIndex !== -1) {
    return html.slice(0, lastBodyIndex) + script + html.slice(lastBodyIndex);
  }

  // Fallback: append to end
  return html + script;
}

/**
 * Render a simple error page.
 */
function renderErrorPage(
  title: string,
  message: string,
  stack?: string,
): string {
  const stackHtml = stack
    ? `<pre style="background:#1a1a1a;padding:16px;border-radius:4px;overflow-x:auto;font-size:12px">${
      escapeHtml(stack)
    }</pre>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      padding: 40px;
      margin: 0;
    }
    h1 { color: #ef4444; margin-bottom: 16px; }
    pre { white-space: pre-wrap; word-break: break-word; color: #fafafa; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <pre>${escapeHtml(message)}</pre>
  ${stackHtml}
</body>
</html>`;
}

/**
 * Broadcast reload message to all WebSocket clients.
 */
function broadcastReload(clients: Set<WebSocket>): void {
  const message: HMRMessage = { type: "reload" };
  const data = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

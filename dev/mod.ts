/**
 * Dev server module for the Tabi Pages framework.
 *
 * Provides hot reload development server with fresh SSR on every request.
 * Uses esbuild bundling with data URL imports to bypass Deno's module cache.
 *
 * @module
 */

export { registerDevServer } from "./server.ts";
export type {
  DevServerCleanup,
  DevServerOptions,
  DevServerState,
  HotReloadMessage,
  HotReloadServer,
} from "./types.ts";

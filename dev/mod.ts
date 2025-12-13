/**
 * Development server module for pages.
 *
 * Provides hot-reload development server using subprocess builds
 * to escape Deno's module cache.
 *
 * @module
 */

export {
  type DevServerHandle,
  type DevServerOptions,
  registerDevServer,
} from "./server.ts";

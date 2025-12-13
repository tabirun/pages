/**
 * Tabirun Pages - Static site generator with Preact and file-based routing.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { pages } from "@tabirun/pages";
 *
 * const site = pages({
 *   pagesDir: "./pages",
 *   outDir: "./dist",
 * });
 *
 * await site.build();
 * ```
 */

export { pages } from "./factory.ts";

export type { DevServerHandle } from "../dev/server.ts";

export type {
  BuildOptions,
  DevOptions,
  PagesConfig,
  PagesInstance,
  ServeOptions,
  SiteMetadata,
} from "./types.ts";

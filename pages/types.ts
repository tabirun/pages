import type { TabiApp } from "@tabirun/app";
import type { DevServerHandle } from "../dev/server.ts";
import type { PagesConfigInput, SiteMetadataConfig } from "./config.ts";

/**
 * Site metadata configuration. When provided, enables sitemap.xml generation.
 */
export type SiteMetadata = SiteMetadataConfig;

/**
 * Configuration for the pages factory (input type for users).
 */
export type PagesConfig = PagesConfigInput;

/**
 * Options for the dev server.
 */
export interface DevOptions {
  /** Directory containing page files. Defaults to "./pages". */
  pagesDir?: string;
}

/**
 * Options for static build.
 */
export interface BuildOptions {
  /** Directory containing page files. Defaults to "./pages". */
  pagesDir?: string;
  /** Output directory for built files. Defaults to "./dist". */
  outDir?: string;
}

/**
 * Options for serving static files.
 */
export interface ServeOptions {
  /** Directory containing built files. Defaults to "./dist". */
  dir?: string;
}

/**
 * Dev server function - registers middleware on app for development.
 * Returns a handle to stop the dev server.
 */
export type DevFn = (
  app: TabiApp,
  options?: DevOptions,
) => Promise<DevServerHandle>;

/**
 * Build function - generates static site.
 */
export type BuildFn = (options?: BuildOptions) => Promise<void>;

/**
 * Serve function - registers middleware on app to serve static files.
 */
export type ServeFn = (app: TabiApp, options?: ServeOptions) => void;

/**
 * Return type of the pages factory function.
 */
export interface PagesInstance {
  /** Start development server with hot reload. */
  dev: DevFn;
  /** Build static site for production. */
  build: BuildFn;
  /** Serve built static files. */
  serve: ServeFn;
}

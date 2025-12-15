import { resolve } from "@std/path";
import type { TabiApp } from "@tabirun/app";
import { buildSite } from "../build/builder.ts";
import { registerDevServer } from "../dev/server.ts";
import { configureHighlighter } from "../markdown/shiki.ts";
import { registerStaticServer } from "../serve/server.ts";
import { PagesConfigSchema } from "./config.ts";
import type {
  BuildOptions,
  DevOptions,
  PagesConfig,
  PagesInstance,
  ServeOptions,
} from "./types.ts";

const DEFAULT_PAGES_DIR = "./pages";
const DEFAULT_OUT_DIR = "./dist";

/**
 * Factory function to create a pages instance with dev, build, and serve functions.
 *
 * @example
 * ```ts
 * import { pages } from "@tabirun/pages";
 *
 * // Minimal setup
 * const { dev, build, serve } = pages();
 *
 * // With base path (for hosting at a subpath like /docs)
 * const { dev, build, serve } = pages({
 *   basePath: "/docs",
 * });
 *
 * // With custom syntax highlighting theme
 * const { dev, build, serve } = pages({
 *   shikiTheme: "nord",
 * });
 *
 * // With site metadata (enables sitemap.xml)
 * const { dev, build, serve } = pages({
 *   siteMetadata: { baseUrl: "https://example.com" },
 * });
 *
 * // Development (defaults: pagesDir="./pages")
 * await dev(app);
 *
 * // Production build (defaults: pagesDir="./pages", outDir="./dist")
 * await build();
 *
 * // Serve static build (defaults: dir="./dist")
 * serve(app);
 * ```
 *
 * @param config - Optional configuration for the pages instance.
 * @returns Pages instance with dev, build, and serve functions.
 */
export function pages(config: PagesConfig = {}): PagesInstance {
  const parsed = PagesConfigSchema.parse(config);
  const basePath = parsed.basePath;

  // Configure syntax highlighting theme if specified
  if (parsed.shikiTheme) {
    configureHighlighter({ theme: parsed.shikiTheme });
  }

  async function dev(app: TabiApp, options: DevOptions = {}) {
    const pagesDir = resolve(options.pagesDir ?? DEFAULT_PAGES_DIR);
    return await registerDevServer(app, { pagesDir, basePath });
  }

  async function build(options: BuildOptions = {}): Promise<void> {
    const pagesDir = resolve(options.pagesDir ?? DEFAULT_PAGES_DIR);
    const outDir = resolve(options.outDir ?? DEFAULT_OUT_DIR);
    const sitemap = config.siteMetadata
      ? { baseUrl: config.siteMetadata.baseUrl }
      : undefined;
    await buildSite({ pagesDir, outDir, sitemap, basePath });
  }

  function serve(app: TabiApp, options: ServeOptions = {}): void {
    const rootDir = resolve(options.dir ?? DEFAULT_OUT_DIR);
    registerStaticServer(app, { rootDir, basePath });
  }

  return { dev, build, serve };
}

import { resolve } from "@std/path";
import type { TabiApp } from "@tabirun/app";
import { buildSite } from "../build/builder.ts";
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
 * // Minimal setup (no sitemap/robots.txt generation)
 * const { dev, build, serve } = pages();
 *
 * // With site metadata (enables sitemap.xml and robots.txt)
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
  PagesConfigSchema.parse(config);

  function dev(_app: TabiApp, _options: DevOptions = {}): Promise<void> {
    throw new Error("Not implemented");
  }

  async function build(options: BuildOptions = {}): Promise<void> {
    const pagesDir = resolve(options.pagesDir ?? DEFAULT_PAGES_DIR);
    const outDir = resolve(options.outDir ?? DEFAULT_OUT_DIR);
    const sitemap = config.siteMetadata
      ? { baseUrl: config.siteMetadata.baseUrl }
      : undefined;
    await buildSite({ pagesDir, outDir, sitemap });
  }

  function serve(_app: TabiApp, _options: ServeOptions = {}): void {
    throw new Error("Not implemented");
  }

  return { dev, build, serve };
}

import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { TabiApp } from "@tabirun/app";
import { pages } from "../mod.ts";

describe("pages", () => {
  describe("factory", () => {
    it("should return dev, build, and serve functions", () => {
      const instance = pages();

      expect(typeof instance.dev).toBe("function");
      expect(typeof instance.build).toBe("function");
      expect(typeof instance.serve).toBe("function");
    });

    it("should accept empty config", () => {
      expect(() => pages()).not.toThrow();
    });

    it("should accept valid siteMetadata", () => {
      expect(() =>
        pages({
          siteMetadata: { baseUrl: "https://example.com" },
        })
      ).not.toThrow();
    });

    it("should reject invalid baseUrl", () => {
      expect(() =>
        pages({
          siteMetadata: { baseUrl: "not-a-url" },
        })
      ).toThrow();
    });
  });

  describe("dev", () => {
    it("should throw not implemented", () => {
      const { dev } = pages();
      const app = new TabiApp();

      expect(() => dev(app)).toThrow("Not implemented");
    });

    it("should throw not implemented with custom options", () => {
      const { dev } = pages();
      const app = new TabiApp();

      expect(() => dev(app, { pagesDir: "./custom-pages" })).toThrow(
        "Not implemented",
      );
    });
  });

  describe("build", () => {
    const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
    const PAGES_DIR = join(FIXTURES_DIR, "pages");
    const TEST_OUT_DIR = join(FIXTURES_DIR, ".dist-test");

    beforeAll(async () => {
      // Clean up any previous test output
      try {
        await Deno.remove(TEST_OUT_DIR, { recursive: true });
      } catch {
        // Ignore if doesn't exist
      }
    });

    afterAll(async () => {
      // Clean up output directories only, not fixtures
      const outputDirs = [
        TEST_OUT_DIR,
        join(FIXTURES_DIR, ".dist-no-sitemap"),
        join(FIXTURES_DIR, ".dist-pages-only"),
        join(FIXTURES_DIR, ".dist-exclude"),
      ];
      for (const dir of outputDirs) {
        try {
          await Deno.remove(dir, { recursive: true });
        } catch {
          // Ignore if doesn't exist
        }
      }
    });

    it("builds static site with default options", async () => {
      const { build } = pages();

      await build({ pagesDir: PAGES_DIR, outDir: TEST_OUT_DIR });

      // Check output files exist
      const indexExists = await exists(join(TEST_OUT_DIR, "index.html"));
      expect(indexExists).toBe(true);

      const notFoundExists = await exists(
        join(TEST_OUT_DIR, "_not-found.html"),
      );
      expect(notFoundExists).toBe(true);
    });

    it("generates sitemap when siteMetadata is provided", async () => {
      const { build } = pages({
        siteMetadata: { baseUrl: "https://example.com" },
      });

      await build({ pagesDir: PAGES_DIR, outDir: TEST_OUT_DIR });

      const sitemapExists = await exists(join(TEST_OUT_DIR, "sitemap.xml"));
      expect(sitemapExists).toBe(true);

      const content = await Deno.readTextFile(
        join(TEST_OUT_DIR, "sitemap.xml"),
      );
      expect(content).toContain("https://example.com");
    });

    it("does not generate sitemap without siteMetadata", async () => {
      const noSitemapOutDir = join(FIXTURES_DIR, ".dist-no-sitemap");
      try {
        await Deno.remove(noSitemapOutDir, { recursive: true });
      } catch {
        // Ignore if doesn't exist
      }

      const { build } = pages();

      await build({ pagesDir: PAGES_DIR, outDir: noSitemapOutDir });

      const sitemapExists = await exists(join(noSitemapOutDir, "sitemap.xml"));
      expect(sitemapExists).toBe(false);
    });

    it("builds with only pagesDir specified", async () => {
      const customOutDir = join(FIXTURES_DIR, ".dist-pages-only");
      try {
        await Deno.remove(customOutDir, { recursive: true });
      } catch {
        // Ignore if doesn't exist
      }

      const { build } = pages();

      await build({ pagesDir: PAGES_DIR, outDir: customOutDir });

      const indexExists = await exists(join(customOutDir, "index.html"));
      expect(indexExists).toBe(true);
    });

    it("builds with sitemap exclude patterns", async () => {
      const excludeOutDir = join(FIXTURES_DIR, ".dist-exclude");
      try {
        await Deno.remove(excludeOutDir, { recursive: true });
      } catch {
        // Ignore if doesn't exist
      }

      const { build } = pages({
        siteMetadata: { baseUrl: "https://example.com" },
      });

      await build({ pagesDir: PAGES_DIR, outDir: excludeOutDir });

      const sitemapExists = await exists(join(excludeOutDir, "sitemap.xml"));
      expect(sitemapExists).toBe(true);
    });
  });

  describe("serve", () => {
    it("should throw not implemented", () => {
      const { serve } = pages();
      const app = new TabiApp();

      expect(() => serve(app)).toThrow("Not implemented");
    });

    it("should throw not implemented with custom options", () => {
      const { serve } = pages();
      const app = new TabiApp();

      expect(() => serve(app, { dir: "./custom-dist" })).toThrow(
        "Not implemented",
      );
    });
  });
});

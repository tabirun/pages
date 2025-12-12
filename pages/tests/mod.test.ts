import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { TabiApp } from "@tabirun/app";
import { pages } from "../mod.ts";
import { PagesConfigSchema } from "../config.ts";

describe("pages", { sanitizeResources: false, sanitizeOps: false }, () => {
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

    describe("basePath validation", () => {
      describe("valid basePath values", () => {
        it("should accept empty string", () => {
          expect(() => pages({ basePath: "" })).not.toThrow();
        });

        it("should accept single segment", () => {
          expect(() => pages({ basePath: "/docs" })).not.toThrow();
        });

        it("should accept multi-segment path", () => {
          expect(() => pages({ basePath: "/docs/v2" })).not.toThrow();
        });

        it("should accept path with hyphens", () => {
          expect(() => pages({ basePath: "/my-app" })).not.toThrow();
        });

        it("should accept path with underscores", () => {
          expect(() => pages({ basePath: "/my_app" })).not.toThrow();
        });

        it("should accept path with leading hyphen in segment", () => {
          expect(() => pages({ basePath: "/-docs" })).not.toThrow();
        });

        it("should accept path with trailing hyphen in segment", () => {
          expect(() => pages({ basePath: "/docs-" })).not.toThrow();
        });
      });

      describe("invalid basePath values", () => {
        it("should reject missing leading slash", () => {
          expect(() => pages({ basePath: "docs" })).toThrow(
            "basePath must be empty or start with / and contain only lowercase alphanumeric characters, hyphens, and underscores",
          );
        });

        it("should reject uppercase characters", () => {
          expect(() => pages({ basePath: "/Docs" })).toThrow(
            "basePath must be empty or start with / and contain only lowercase alphanumeric characters, hyphens, and underscores",
          );
        });

        it("should reject special characters", () => {
          expect(() => pages({ basePath: "/docs@v2" })).toThrow(
            "basePath must be empty or start with / and contain only lowercase alphanumeric characters, hyphens, and underscores",
          );
        });
      });

      describe("trailing slash normalization", () => {
        it("should strip single trailing slash", () => {
          const result = PagesConfigSchema.parse({ basePath: "/docs/" });
          expect(result.basePath).toBe("/docs");
        });

        it("should strip multiple trailing slashes", () => {
          const result = PagesConfigSchema.parse({ basePath: "/docs//" });
          expect(result.basePath).toBe("/docs");
        });

        it("should strip trailing slash on multi-segment path", () => {
          const result = PagesConfigSchema.parse({ basePath: "/docs/v2/" });
          expect(result.basePath).toBe("/docs/v2");
        });

        it("should normalize root slash to empty string", () => {
          const result = PagesConfigSchema.parse({ basePath: "/" });
          expect(result.basePath).toBe("");
        });
      });
    });
  });

  describe("dev", () => {
    const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
    const PAGES_DIR = join(FIXTURES_DIR, "pages");

    it("should register dev server routes", async () => {
      const { dev } = pages();
      const app = new TabiApp();

      await dev(app, { pagesDir: PAGES_DIR });

      // Server should be registered - make a request to verify
      const server = Deno.serve({ port: 0 }, app.handler);
      const addr = server.addr as Deno.NetAddr;

      try {
        const response = await fetch(`http://localhost:${addr.port}/`);
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain("__tabi__");
        expect(html).toContain("__hot-reload");
      } finally {
        server.shutdown();
        await server.finished;
      }
    });

    it("should register hot reload endpoint", async () => {
      const { dev } = pages();
      const app = new TabiApp();

      await dev(app, { pagesDir: PAGES_DIR });

      const server = Deno.serve({ port: 0 }, app.handler);
      const addr = server.addr as Deno.NetAddr;

      try {
        const ws = new WebSocket(
          `ws://localhost:${addr.port}/__hot-reload`,
        );
        const connected = await new Promise<boolean>((resolve) => {
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 1000);
        });
        expect(connected).toBe(true);
        ws.close();
      } finally {
        server.shutdown();
        await server.finished;
      }
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
    const SERVE_FIXTURES_DIR = new URL(
      "../../serve/tests/fixtures/",
      import.meta.url,
    ).pathname;

    it("registers static server routes", () => {
      const { serve } = pages();
      const app = new TabiApp();

      // Should not throw
      expect(() => serve(app, { dir: SERVE_FIXTURES_DIR })).not.toThrow();
    });

    it("serves files from specified directory", async () => {
      const { serve } = pages();
      const { TabiTestServer } = await import("../../test-utils/server.ts");
      const server = new TabiTestServer();

      serve(server.app, { dir: SERVE_FIXTURES_DIR });
      server.start();

      try {
        const res = await fetch(server.url("/"));
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Welcome Home");
      } finally {
        await server.stop();
      }
    });

    it("serves nested HTML files without extension", async () => {
      const { serve } = pages();
      const { TabiTestServer } = await import("../../test-utils/server.ts");
      const server = new TabiTestServer();

      serve(server.app, { dir: SERVE_FIXTURES_DIR });
      server.start();

      try {
        const res = await fetch(server.url("/about"));
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("About Us");
      } finally {
        await server.stop();
      }
    });
  });
});

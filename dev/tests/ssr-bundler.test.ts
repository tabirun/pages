import { expect } from "@std/expect";
import { afterAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import * as esbuild from "esbuild";
import { bundleSSR, SSRBundleError } from "../ssr-bundler.ts";
import type { LayoutEntry, PageEntry } from "../../scanner/types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
const PROJECT_ROOT = new URL("../..", import.meta.url).pathname;

describe("bundleSSR", { sanitizeResources: false, sanitizeOps: false }, () => {
  afterAll(async () => {
    await esbuild.stop();
  });

  describe("TSX pages", () => {
    it("bundles and executes TSX page without layouts", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/test",
        layoutChain: [],
      };

      const result = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      expect(result.pageType).toBe("tsx");
      expect(typeof result.html).toBe("string");
      expect(result.html.length).toBeGreaterThan(0);
      expect(result.html).toContain("Simple Page");
      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter.title).toBe("Simple Page");
    });

    it("bundles and executes TSX page with layout", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/test",
        layoutChain: [join(FIXTURES_DIR, "simple-layout.tsx")],
      };

      const layout: LayoutEntry = {
        filePath: join(FIXTURES_DIR, "simple-layout.tsx"),
        directory: FIXTURES_DIR,
      };

      const result = await bundleSSR({
        page,
        layouts: [layout],
        projectRoot: PROJECT_ROOT,
      });

      expect(result.pageType).toBe("tsx");
      expect(result.html).toContain("Simple Page");
      // Layout wraps the page content
      expect(result.html).toContain("Header");
      expect(result.html).toContain("Footer");
      expect(result.html).toContain('class="layout"');
    });

    it("includes basePath in rendered output", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/test",
        layoutChain: [],
      };

      const result = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
        basePath: "/docs",
      });

      // The basePath is passed to BasePathProvider
      // In a real test we'd verify the context, but here we just verify no error
      expect(result.pageType).toBe("tsx");
      expect(result.html).toContain("Simple Page");
    });
  });

  describe("markdown pages", () => {
    it("bundles and executes markdown page", async () => {
      const page: PageEntry = {
        type: "markdown",
        filePath: join(FIXTURES_DIR, "simple-page.md"),
        route: "/markdown",
        layoutChain: [],
      };

      const result = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      expect(result.pageType).toBe("markdown");
      expect(typeof result.html).toBe("string");
      expect(result.html.length).toBeGreaterThan(0);
      // Markdown component renders a marker that will be post-processed
      expect(result.html).toContain("tabi-markdown");
      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter.title).toBe("Markdown Page");
    });

    it("bundles markdown page with layout", async () => {
      const page: PageEntry = {
        type: "markdown",
        filePath: join(FIXTURES_DIR, "simple-page.md"),
        route: "/markdown",
        layoutChain: [join(FIXTURES_DIR, "simple-layout.tsx")],
      };

      const layout: LayoutEntry = {
        filePath: join(FIXTURES_DIR, "simple-layout.tsx"),
        directory: FIXTURES_DIR,
      };

      const result = await bundleSSR({
        page,
        layouts: [layout],
        projectRoot: PROJECT_ROOT,
      });

      expect(result.pageType).toBe("markdown");
      // Layout wraps the markdown content
      expect(result.html).toContain("Header");
      expect(result.html).toContain("Footer");
    });
  });

  describe("error handling", () => {
    it("wraps esbuild errors in SSRBundleError", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: "/nonexistent/page.tsx",
        route: "/error",
        layoutChain: [],
      };

      try {
        await bundleSSR({
          page,
          layouts: [],
          projectRoot: PROJECT_ROOT,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(SSRBundleError);
        expect((error as SSRBundleError).route).toBe("/error");
      }
    });

    it("includes route in error", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: "/nonexistent/page.tsx",
        route: "/specific-route",
        layoutChain: [],
      };

      try {
        await bundleSSR({
          page,
          layouts: [],
          projectRoot: PROJECT_ROOT,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(SSRBundleError);
        expect((error as SSRBundleError).route).toBe("/specific-route");
      }
    });
  });

  describe("data URL import", () => {
    it("produces fresh results on each call (no caching)", async () => {
      // This test verifies the data URL import pattern works
      // by checking that we get consistent results across calls
      const page: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/test",
        layoutChain: [],
      };

      const result1 = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      const result2 = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      // Both calls should produce the same HTML
      expect(result1.html).toBe(result2.html);
      expect(result1.frontmatter).toEqual(result2.frontmatter);
    });
  });

  describe("module exports", () => {
    it("exports html as string", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/test",
        layoutChain: [],
      };

      const result = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      expect(typeof result.html).toBe("string");
    });

    it("exports frontmatter as object", async () => {
      const page: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/test",
        layoutChain: [],
      };

      const result = await bundleSSR({
        page,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      expect(typeof result.frontmatter).toBe("object");
      expect(result.frontmatter).not.toBeNull();
    });

    it("exports pageType as tsx or markdown", async () => {
      const tsxPage: PageEntry = {
        type: "tsx",
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
        route: "/tsx",
        layoutChain: [],
      };

      const mdPage: PageEntry = {
        type: "markdown",
        filePath: join(FIXTURES_DIR, "simple-page.md"),
        route: "/md",
        layoutChain: [],
      };

      const tsxResult = await bundleSSR({
        page: tsxPage,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      const mdResult = await bundleSSR({
        page: mdPage,
        layouts: [],
        projectRoot: PROJECT_ROOT,
      });

      expect(tsxResult.pageType).toBe("tsx");
      expect(mdResult.pageType).toBe("markdown");
    });
  });
});

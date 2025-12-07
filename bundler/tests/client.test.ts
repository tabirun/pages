import { expect } from "@std/expect";
import { afterAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { bundleClient, stopEsbuild } from "../client.ts";
import { BundleError } from "../types.ts";
import type {
  LoadedLayout,
  LoadedMarkdownPage,
  LoadedTsxPage,
} from "../../loaders/mod.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
const PROJECT_ROOT = new URL("../..", import.meta.url).pathname;
const TEST_OUT_DIR = join(PROJECT_ROOT, ".tabi-test");

describe("bundleClient", () => {
  afterAll(async () => {
    await stopEsbuild();
    // Clean up test output
    try {
      Deno.removeSync(TEST_OUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe("development mode", () => {
    it("bundles TSX page without layouts", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test Page" },
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      const result = await bundleClient({
        page,
        layouts: [],
        route: "/test",
        outDir: TEST_OUT_DIR,
        mode: "development",
        projectRoot: PROJECT_ROOT,
      });

      // Check output paths
      expect(result.outputPath).toContain(".tabi-test");
      expect(result.outputPath).toContain("test.js");
      expect(result.publicPath).toBe("/_tabi/test.js");
      expect(result.hash).toBeUndefined();

      // Verify file exists
      const stat = await Deno.stat(result.outputPath);
      expect(stat.isFile).toBe(true);

      // Verify bundle contains expected code
      const content = await Deno.readTextFile(result.outputPath);
      // Check for data script ID (string literal preserved in bundle)
      expect(content).toContain("__TABI_DATA__");
      // Check bundle has substantial content (Preact + page code)
      expect(content.length).toBeGreaterThan(1000);
    });

    it("bundles TSX page with layout", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test Page" },
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      const layout: LoadedLayout = {
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-layout.tsx"),
        directory: FIXTURES_DIR,
      };

      const result = await bundleClient({
        page,
        layouts: [layout],
        route: "/with-layout",
        outDir: TEST_OUT_DIR,
        mode: "development",
        projectRoot: PROJECT_ROOT,
      });

      expect(result.publicPath).toBe("/_tabi/with-layout.js");

      // Verify bundle contains expected code
      const content = await Deno.readTextFile(result.outputPath);
      expect(content).toContain("__TABI_DATA__");
      // Bundle with layout should be larger than without
      expect(content.length).toBeGreaterThan(1000);
    });

    it("bundles markdown page", async () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Markdown Page" },
        content: "# Hello World",
        filePath: join(FIXTURES_DIR, "test.md"),
      };

      const result = await bundleClient({
        page,
        layouts: [],
        route: "/markdown",
        outDir: TEST_OUT_DIR,
        mode: "development",
        projectRoot: PROJECT_ROOT,
      });

      expect(result.publicPath).toBe("/_tabi/markdown.js");

      // Verify bundle contains expected code
      const content = await Deno.readTextFile(result.outputPath);
      expect(content).toContain("__TABI_DATA__");
      expect(content.length).toBeGreaterThan(1000);
    });

    it("bundles root route as index", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Home" },
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      const result = await bundleClient({
        page,
        layouts: [],
        route: "/",
        outDir: TEST_OUT_DIR,
        mode: "development",
        projectRoot: PROJECT_ROOT,
      });

      expect(result.publicPath).toBe("/_tabi/index.js");
      expect(result.outputPath).toContain("index.js");
    });

    it("bundles nested route", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Nested" },
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      const result = await bundleClient({
        page,
        layouts: [],
        route: "/blog/posts/article",
        outDir: TEST_OUT_DIR,
        mode: "development",
        projectRoot: PROJECT_ROOT,
      });

      expect(result.publicPath).toBe("/_tabi/blog/posts/article.js");
    });
  });

  describe("production mode", () => {
    it("produces minified output with hash", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Prod Page" },
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      const result = await bundleClient({
        page,
        layouts: [],
        route: "/prod",
        outDir: TEST_OUT_DIR,
        mode: "production",
        projectRoot: PROJECT_ROOT,
      });

      // Should have hash in production
      expect(result.hash).toBeDefined();
      expect(result.hash!.length).toBeGreaterThan(0);

      // Public path should contain hash
      expect(result.publicPath).toMatch(/\/_tabi\/prod-[A-Z0-9]+\.js/i);

      // Verify minification (no sourcemap comment in production)
      const content = await Deno.readTextFile(result.outputPath);
      expect(content).not.toContain("//# sourceMappingURL=data:");
    });
  });

  describe("path validation", () => {
    it("rejects relative outDir", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      try {
        await bundleClient({
          page,
          layouts: [],
          route: "/test",
          outDir: "relative/path",
          mode: "development",
          projectRoot: PROJECT_ROOT,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BundleError);
        expect((error as BundleError).message).toContain("absolute path");
      }
    });

    it("rejects relative projectRoot", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      try {
        await bundleClient({
          page,
          layouts: [],
          route: "/test",
          outDir: TEST_OUT_DIR,
          mode: "development",
          projectRoot: "relative/root",
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BundleError);
        expect((error as BundleError).message).toContain("absolute path");
      }
    });

    it("rejects route with path traversal", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      try {
        await bundleClient({
          page,
          layouts: [],
          route: "/../../etc/passwd",
          outDir: TEST_OUT_DIR,
          mode: "development",
          projectRoot: PROJECT_ROOT,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BundleError);
        expect((error as BundleError).message).toContain("path traversal");
      }
    });

    it("rejects outDir outside projectRoot boundary", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: join(FIXTURES_DIR, "simple-page.tsx"),
      };

      try {
        await bundleClient({
          page,
          layouts: [],
          route: "/test",
          outDir: "/tmp/unrelated/output",
          mode: "development",
          projectRoot: PROJECT_ROOT,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BundleError);
        expect((error as BundleError).message).toContain(
          "within or adjacent to projectRoot",
        );
      }
    });
  });

  describe("error handling", () => {
    it("wraps esbuild errors in BundleError", async () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        // Non-existent file will cause esbuild to fail
        filePath: "/nonexistent/page.tsx",
      };

      try {
        await bundleClient({
          page,
          layouts: [],
          route: "/error",
          outDir: TEST_OUT_DIR,
          mode: "development",
          projectRoot: PROJECT_ROOT,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BundleError);
        expect((error as BundleError).route).toBe("/error");
      }
    });
  });
});

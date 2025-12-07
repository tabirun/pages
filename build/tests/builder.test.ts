import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { buildSite } from "../builder.ts";
import { BuildError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
const PAGES_DIR = join(FIXTURES_DIR, "pages");
const TEST_OUT_DIR = join(FIXTURES_DIR, ".dist-test");

const FIXTURES_NO_LAYOUT_DIR = new URL(
  "./fixtures-no-layout/",
  import.meta.url,
).pathname;
const PAGES_NO_LAYOUT_DIR = join(FIXTURES_NO_LAYOUT_DIR, "pages");
const TEST_OUT_NO_LAYOUT_DIR = join(FIXTURES_NO_LAYOUT_DIR, ".dist-test");

describe("buildSite", () => {
  beforeAll(async () => {
    // Clean up any previous test output
    try {
      await Deno.remove(TEST_OUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
    try {
      await Deno.remove(TEST_OUT_NO_LAYOUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up test output
    try {
      await Deno.remove(TEST_OUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
    try {
      await Deno.remove(TEST_OUT_NO_LAYOUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe("successful builds", () => {
    it("builds all pages in directory", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Should have built 3 regular pages + _not-found + _error
      expect(result.pages.length).toBe(5);
      expect(result.durationMs).toBeGreaterThan(0);

      // Check routes are correct (sort both to ignore order)
      const routes = result.pages.map((p) => p.route).sort();
      const expected = [
        "/",
        "/about",
        "/blog/post",
        "/_error",
        "/_not-found",
      ].sort();
      expect(routes).toEqual(expected);
    });

    it("generates HTML files at correct paths", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check HTML files exist
      for (const page of result.pages) {
        const htmlExists = await exists(page.htmlPath);
        expect(htmlExists).toBe(true);
      }

      // Check specific paths
      const indexPage = result.pages.find((p) => p.route === "/");
      expect(indexPage?.htmlPath).toBe(join(TEST_OUT_DIR, "index.html"));

      const aboutPage = result.pages.find((p) => p.route === "/about");
      expect(aboutPage?.htmlPath).toBe(join(TEST_OUT_DIR, "about.html"));

      const blogPage = result.pages.find((p) => p.route === "/blog/post");
      expect(blogPage?.htmlPath).toBe(join(TEST_OUT_DIR, "blog/post.html"));

      const notFoundPage = result.pages.find((p) => p.route === "/_not-found");
      expect(notFoundPage?.htmlPath).toBe(
        join(TEST_OUT_DIR, "_not-found.html"),
      );

      const errorPage = result.pages.find((p) => p.route === "/_error");
      expect(errorPage?.htmlPath).toBe(join(TEST_OUT_DIR, "_error.html"));
    });

    it("generates JS bundles in __tabi directory", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check bundles exist
      for (const page of result.pages) {
        const bundleExists = await exists(page.bundlePath);
        expect(bundleExists).toBe(true);
      }

      // Check bundles are in __tabi directory
      for (const page of result.pages) {
        expect(page.bundlePath).toContain("__tabi");
      }

      // Check public paths have hashes (production mode)
      for (const page of result.pages) {
        expect(page.bundlePublicPath).toMatch(/\/_tabi\/.*-[A-Z0-9]+\.js/i);
      }
    });

    it("generates valid HTML documents", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      const indexPage = result.pages.find((p) => p.route === "/");
      const html = await Deno.readTextFile(indexPage!.htmlPath);

      // Check DOCTYPE and basic structure
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("</head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
      expect(html).toContain("</html>");

      // Check hydration elements
      expect(html).toContain('id="__tabi__"');
      expect(html).toContain('id="__TABI_DATA__"');
      expect(html).toContain('<script type="module"');
    });

    it("includes page content in HTML", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check TSX page content
      const indexPage = result.pages.find((p) => p.route === "/");
      const indexHtml = await Deno.readTextFile(indexPage!.htmlPath);
      expect(indexHtml).toContain("Welcome Home");

      // Check markdown page content (rendered)
      const aboutPage = result.pages.find((p) => p.route === "/about");
      const aboutHtml = await Deno.readTextFile(aboutPage!.htmlPath);
      expect(aboutHtml).toContain("About Us");
    });

    it("applies layouts to pages", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      const indexPage = result.pages.find((p) => p.route === "/");
      const html = await Deno.readTextFile(indexPage!.htmlPath);

      // Check layout content is present
      expect(html).toContain("root-layout");
      expect(html).toContain("Site Header");
      expect(html).toContain("Site Footer");
    });

    it("copies public assets to output", async () => {
      await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check robots.txt was copied
      const robotsPath = join(TEST_OUT_DIR, "robots.txt");
      const robotsExists = await exists(robotsPath);
      expect(robotsExists).toBe(true);

      const robotsContent = await Deno.readTextFile(robotsPath);
      expect(robotsContent).toContain("User-agent: *");
    });

    it("cleans output directory before build", async () => {
      // Create a file that should be removed
      await Deno.mkdir(TEST_OUT_DIR, { recursive: true });
      const staleFile = join(TEST_OUT_DIR, "stale.txt");
      await Deno.writeTextFile(staleFile, "stale content");

      await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Stale file should be gone
      const staleExists = await exists(staleFile);
      expect(staleExists).toBe(false);
    });

    it("uses custom _not-found page when provided", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      const notFoundPage = result.pages.find((p) => p.route === "/_not-found");
      const html = await Deno.readTextFile(notFoundPage!.htmlPath);

      // Should contain custom content from _not-found.tsx fixture
      expect(html).toContain("404 - Page Not Found");
    });

    it("uses default _error page when none provided", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      const errorPage = result.pages.find((p) => p.route === "/_error");
      const html = await Deno.readTextFile(errorPage!.htmlPath);

      // Should contain default error content
      expect(html).toContain("Error");
      expect(html).toContain("Something went wrong");
    });

    it("applies root layout to system pages", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check _not-found has layout
      const notFoundPage = result.pages.find((p) => p.route === "/_not-found");
      const notFoundHtml = await Deno.readTextFile(notFoundPage!.htmlPath);
      expect(notFoundHtml).toContain("root-layout");
      expect(notFoundHtml).toContain("Site Header");

      // Check _error has layout
      const errorPage = result.pages.find((p) => p.route === "/_error");
      const errorHtml = await Deno.readTextFile(errorPage!.htmlPath);
      expect(errorHtml).toContain("root-layout");
      expect(errorHtml).toContain("Site Header");
    });

    it("builds without root layout", async () => {
      const result = await buildSite({
        pagesDir: PAGES_NO_LAYOUT_DIR,
        outDir: TEST_OUT_NO_LAYOUT_DIR,
      });

      // Should build page + system pages
      expect(result.pages.length).toBe(3);

      // System pages should not have layout content
      const notFoundPage = result.pages.find((p) => p.route === "/_not-found");
      const notFoundHtml = await Deno.readTextFile(notFoundPage!.htmlPath);
      expect(notFoundHtml).not.toContain("root-layout");

      const errorPage = result.pages.find((p) => p.route === "/_error");
      const errorHtml = await Deno.readTextFile(errorPage!.htmlPath);
      expect(errorHtml).not.toContain("root-layout");
    });
  });

  describe("path validation", () => {
    it("rejects relative pagesDir", async () => {
      try {
        await buildSite({
          pagesDir: "relative/pages",
          outDir: TEST_OUT_DIR,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BuildError);
        expect((error as BuildError).message).toContain("absolute path");
      }
    });

    it("rejects relative outDir", async () => {
      try {
        await buildSite({
          pagesDir: PAGES_DIR,
          outDir: "relative/dist",
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BuildError);
        expect((error as BuildError).message).toContain("absolute path");
      }
    });

    it("rejects pagesDir with path traversal", async () => {
      try {
        await buildSite({
          pagesDir: "/project/../etc/pages",
          outDir: TEST_OUT_DIR,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BuildError);
        expect((error as BuildError).message).toContain("..");
      }
    });

    it("rejects outDir with path traversal", async () => {
      try {
        await buildSite({
          pagesDir: PAGES_DIR,
          outDir: "/project/../etc/dist",
        });
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(BuildError);
        expect((error as BuildError).message).toContain("..");
      }
    });
  });
});

describe("BuildError", () => {
  it("has correct name property", () => {
    const error = new BuildError("test message");
    expect(error.name).toBe("BuildError");
  });

  it("stores route when provided", () => {
    const error = new BuildError("test message", "/blog/post");
    expect(error.route).toBe("/blog/post");
  });

  it("supports cause option", () => {
    const cause = new Error("original error");
    const error = new BuildError("wrapped", "/route", { cause });
    expect(error.cause).toBe(cause);
  });
});

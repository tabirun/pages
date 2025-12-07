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

const FIXTURES_UNOCSS_DIR = new URL(
  "./fixtures-unocss/",
  import.meta.url,
).pathname;
const PAGES_UNOCSS_DIR = join(FIXTURES_UNOCSS_DIR, "pages");
const TEST_OUT_UNOCSS_DIR = join(FIXTURES_UNOCSS_DIR, ".dist-test");

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
    try {
      await Deno.remove(TEST_OUT_UNOCSS_DIR, { recursive: true });
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
    try {
      await Deno.remove(TEST_OUT_UNOCSS_DIR, { recursive: true });
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
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check robots.txt was copied without hash (well-known file)
      const robotsPath = join(TEST_OUT_DIR, "robots.txt");
      const robotsExists = await exists(robotsPath);
      expect(robotsExists).toBe(true);

      const robotsContent = await Deno.readTextFile(robotsPath);
      expect(robotsContent).toContain("User-agent: *");

      // Verify robots.txt wasn't hashed
      const robotsAsset = result.assets.find((a) =>
        a.originalPath === "/robots.txt"
      );
      expect(robotsAsset).toBeDefined();
      expect(robotsAsset!.wasHashed).toBe(false);
      expect(robotsAsset!.hashedPath).toBe("/robots.txt");
    });

    it("hashes regular assets for cache busting", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Check logo.txt was copied with hash
      const logoAsset = result.assets.find((a) =>
        a.originalPath === "/images/logo.txt"
      );
      expect(logoAsset).toBeDefined();
      expect(logoAsset!.wasHashed).toBe(true);
      expect(logoAsset!.hashedPath).toMatch(
        /^\/images\/logo-[A-F0-9]{8}\.txt$/,
      );

      // Verify hashed file exists
      const logoExists = await exists(logoAsset!.outputPath);
      expect(logoExists).toBe(true);
    });

    it("rewrites asset URLs in HTML", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Get the hashed path for the logo
      const logoAsset = result.assets.find((a) =>
        a.originalPath === "/images/logo.txt"
      );
      expect(logoAsset).toBeDefined();

      // Check that index.html has the rewritten asset URL
      const indexPage = result.pages.find((p) => p.route === "/");
      const html = await Deno.readTextFile(indexPage!.htmlPath);

      // Should contain hashed path, not original
      expect(html).toContain(logoAsset!.hashedPath);
      expect(html).not.toContain('src="/images/logo.txt"');
    });

    it("rewrites asset URLs in CSS files", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // Get the hashed path for the logo
      const logoAsset = result.assets.find((a) =>
        a.originalPath === "/images/logo.txt"
      );
      expect(logoAsset).toBeDefined();

      // Find the styles.css in output (it gets hashed too)
      const stylesAsset = result.assets.find((a) =>
        a.originalPath === "/styles.css"
      );
      expect(stylesAsset).toBeDefined();

      // Read the CSS file and check that url() was rewritten
      const css = await Deno.readTextFile(stylesAsset!.outputPath);
      expect(css).toContain(logoAsset!.hashedPath);
      expect(css).not.toContain('url("/images/logo.txt")');
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

  describe("UnoCSS integration", () => {
    it("compiles UnoCSS when config exists", async () => {
      const result = await buildSite({
        pagesDir: PAGES_UNOCSS_DIR,
        outDir: TEST_OUT_UNOCSS_DIR,
      });

      // Should have unoCSS result
      expect(result.unoCSS).toBeDefined();
      expect(result.unoCSS!.publicPath).toMatch(
        /^\/__styles\/[A-F0-9]{8}\.css$/,
      );
    });

    it("generates CSS file in __styles directory", async () => {
      const result = await buildSite({
        pagesDir: PAGES_UNOCSS_DIR,
        outDir: TEST_OUT_UNOCSS_DIR,
      });

      // Extract filename from public path
      const cssFilename = result.unoCSS!.publicPath.split("/").pop()!;
      const cssPath = join(TEST_OUT_UNOCSS_DIR, "__styles", cssFilename);

      // Verify CSS file exists
      const cssExists = await exists(cssPath);
      expect(cssExists).toBe(true);

      // Verify CSS contains expected rules
      const css = await Deno.readTextFile(cssPath);
      expect(css).toContain("margin");
      expect(css).toContain("padding");
      expect(css).toContain("color");
    });

    it("injects stylesheet link into HTML", async () => {
      const result = await buildSite({
        pagesDir: PAGES_UNOCSS_DIR,
        outDir: TEST_OUT_UNOCSS_DIR,
      });

      const indexPage = result.pages.find((p) => p.route === "/");
      const html = await Deno.readTextFile(indexPage!.htmlPath);

      // Should contain stylesheet link with hashed path
      expect(html).toContain(
        `<link rel="stylesheet" href="${result.unoCSS!.publicPath}">`,
      );
      // Link should be in head
      expect(html).toMatch(
        /<link rel="stylesheet" href="\/__styles\/[A-F0-9]{8}\.css">\n<\/head>/,
      );
    });

    it("returns undefined unoCSS when no config exists", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      // fixtures/ directory has no uno.config.ts
      expect(result.unoCSS).toBeUndefined();
    });
  });

  describe("sitemap integration", () => {
    it("generates sitemap when configured", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
        sitemap: { baseUrl: "https://example.com" },
      });

      expect(result.sitemap).toBeDefined();
      expect(result.sitemap!.outputPath).toContain("sitemap.xml");
      // Should exclude system pages
      expect(result.sitemap!.urlCount).toBe(3); // /, /about, /blog/post

      const sitemapExists = await exists(result.sitemap!.outputPath);
      expect(sitemapExists).toBe(true);

      const content = await Deno.readTextFile(result.sitemap!.outputPath);
      expect(content).toContain("https://example.com");
      expect(content).not.toContain("_not-found");
      expect(content).not.toContain("_error");
    });

    it("excludes custom routes from sitemap", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
        sitemap: {
          baseUrl: "https://example.com",
          exclude: ["/blog/*"],
        },
      });

      expect(result.sitemap!.urlCount).toBe(2); // /, /about

      const content = await Deno.readTextFile(result.sitemap!.outputPath);
      expect(content).not.toContain("/blog/");
    });

    it("returns undefined sitemap when not configured", async () => {
      const result = await buildSite({
        pagesDir: PAGES_DIR,
        outDir: TEST_OUT_DIR,
      });

      expect(result.sitemap).toBeUndefined();
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

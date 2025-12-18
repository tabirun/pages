import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path";
import { scanPages } from "../scanner.ts";

describe("scanPages", () => {
  describe("pages discovery", () => {
    it("should discover markdown pages", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "index.md"), "");
        await Deno.writeTextFile(join(tempDir, "pages", "about.md"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages.length).toBe(2);
        expect(manifest.pages.map((p) => p.route).sort()).toEqual([
          "/",
          "/about",
        ]);
        expect(manifest.pages.every((p) => p.type === "markdown")).toBe(true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover tsx pages", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "index.tsx"), "");
        await Deno.writeTextFile(join(tempDir, "pages", "contact.tsx"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages.length).toBe(2);
        expect(manifest.pages.map((p) => p.route).sort()).toEqual([
          "/",
          "/contact",
        ]);
        expect(manifest.pages.every((p) => p.type === "tsx")).toBe(true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover nested pages", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages", "blog"), { recursive: true });
        await Deno.writeTextFile(join(tempDir, "pages", "blog", "post.md"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages.length).toBe(1);
        expect(manifest.pages[0].route).toBe("/blog/post");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should convert nested index pages to directory routes", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages", "blog"), { recursive: true });
        await Deno.writeTextFile(
          join(tempDir, "pages", "blog", "index.md"),
          "",
        );

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages.length).toBe(1);
        expect(manifest.pages[0].route).toBe("/blog");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should skip hidden directories", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages", ".git"), { recursive: true });
        await Deno.writeTextFile(
          join(tempDir, "pages", ".git", "config.md"),
          "",
        );
        await Deno.writeTextFile(join(tempDir, "pages", "index.md"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages.length).toBe(1);
        expect(manifest.pages[0].route).toBe("/");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("layouts discovery", () => {
    it("should discover root layout", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "_layout.tsx"), "");
        await Deno.writeTextFile(join(tempDir, "pages", "index.md"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.layouts.length).toBe(1);
        expect(manifest.layouts[0].directory).toBe("");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover nested layouts", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages", "blog"), { recursive: true });
        await Deno.writeTextFile(join(tempDir, "pages", "_layout.tsx"), "");
        await Deno.writeTextFile(
          join(tempDir, "pages", "blog", "_layout.tsx"),
          "",
        );

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.layouts.length).toBe(2);
        expect(manifest.layouts.map((l) => l.directory).sort()).toEqual([
          "",
          "blog",
        ]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should build layout chains for pages", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages", "blog"), { recursive: true });
        await Deno.writeTextFile(join(tempDir, "pages", "_layout.tsx"), "");
        await Deno.writeTextFile(
          join(tempDir, "pages", "blog", "_layout.tsx"),
          "",
        );
        await Deno.writeTextFile(join(tempDir, "pages", "blog", "post.md"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        const blogPost = manifest.pages.find((p) => p.route === "/blog/post");
        expect(blogPost).toBeDefined();
        expect(blogPost!.layoutChain.length).toBe(2);
        expect(blogPost!.layoutChain[0]).toContain("_layout.tsx");
        expect(blogPost!.layoutChain[1]).toContain("blog");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("system files discovery", () => {
    it("should discover _html.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "_html.tsx"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.systemFiles.html).not.toBeNull();
        expect(manifest.systemFiles.html).toContain("_html.tsx");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover _not-found.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "_not-found.tsx"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.systemFiles.notFound).not.toBeNull();
        expect(manifest.systemFiles.notFound).toContain("_not-found.tsx");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover _error.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "_error.tsx"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.systemFiles.error).not.toBeNull();
        expect(manifest.systemFiles.error).toContain("_error.tsx");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover postcss.config.ts at root", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "postcss.config.ts"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.systemFiles.postcssConfig).not.toBeNull();
        expect(manifest.systemFiles.postcssConfig).toContain(
          "postcss.config.ts",
        );
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should return null for missing system files", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.systemFiles.html).toBeNull();
        expect(manifest.systemFiles.notFound).toBeNull();
        expect(manifest.systemFiles.error).toBeNull();
        expect(manifest.systemFiles.postcssConfig).toBeNull();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("public assets discovery", () => {
    it("should discover public assets", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "public"));
        await Deno.writeTextFile(join(tempDir, "public", "favicon.ico"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.publicAssets.length).toBe(1);
        expect(manifest.publicAssets[0].urlPath).toBe("/favicon.ico");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should discover nested public assets", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "public", "images"), {
          recursive: true,
        });
        await Deno.writeTextFile(
          join(tempDir, "public", "images", "logo.png"),
          "",
        );

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.publicAssets.length).toBe(1);
        expect(manifest.publicAssets[0].urlPath).toBe("/images/logo.png");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should return empty array when public directory missing", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.publicAssets).toEqual([]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty pages directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages).toEqual([]);
        expect(manifest.layouts).toEqual([]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should handle missing pages directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages).toEqual([]);
        expect(manifest.layouts).toEqual([]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should use custom pagesDir", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "src", "routes"), { recursive: true });
        await Deno.writeTextFile(
          join(tempDir, "src", "routes", "index.md"),
          "",
        );

        const manifest = await scanPages({
          rootDir: tempDir,
          pagesDir: "src/routes",
        });

        expect(manifest.pages.length).toBe(1);
        expect(manifest.pages[0].route).toBe("/");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should use custom publicDir", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "static"));
        await Deno.writeTextFile(join(tempDir, "static", "favicon.ico"), "");

        const manifest = await scanPages({
          rootDir: tempDir,
          publicDir: "static",
        });

        expect(manifest.publicAssets.length).toBe(1);
        expect(manifest.publicAssets[0].urlPath).toBe("/favicon.ico");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should not include other files in pages", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "index.md"), "");
        await Deno.writeTextFile(join(tempDir, "pages", "utils.ts"), "");
        await Deno.writeTextFile(join(tempDir, "pages", "_helpers.tsx"), "");

        const manifest = await scanPages({ rootDir: tempDir });

        expect(manifest.pages.length).toBe(1);
        expect(manifest.pages[0].route).toBe("/");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });
});

import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { generateSitemap } from "../sitemap.ts";

let TEST_OUT_DIR: string;

describe("generateSitemap", () => {
  beforeAll(async () => {
    TEST_OUT_DIR = await Deno.makeTempDir({ prefix: "sitemap-test-" });
  });

  afterAll(() => {
    // Temp directories are cleaned up by the OS
  });

  it("generates sitemap with all routes", async () => {
    const result = await generateSitemap({
      routes: ["/", "/about", "/blog/post"],
      config: { baseUrl: "https://example.com" },
      outDir: TEST_OUT_DIR,
    });

    expect(result.urlCount).toBe(3);

    const content = await Deno.readTextFile(result.outputPath);
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain("<urlset");
    expect(content).toContain("<loc>https://example.com</loc>");
    expect(content).toContain("<loc>https://example.com/about</loc>");
    expect(content).toContain("<loc>https://example.com/blog/post</loc>");
  });

  it("excludes system routes by default", async () => {
    const result = await generateSitemap({
      routes: ["/", "/about", "/_not-found", "/_error"],
      config: { baseUrl: "https://example.com" },
      outDir: TEST_OUT_DIR,
    });

    expect(result.urlCount).toBe(2);

    const content = await Deno.readTextFile(result.outputPath);
    expect(content).toContain("<loc>https://example.com</loc>");
    expect(content).toContain("<loc>https://example.com/about</loc>");
    expect(content).not.toContain("_not-found");
    expect(content).not.toContain("_error");
  });

  it("supports custom route exclusions", async () => {
    const result = await generateSitemap({
      routes: ["/", "/about", "/admin", "/draft/post"],
      config: {
        baseUrl: "https://example.com",
        exclude: ["/admin", "/draft/*"],
      },
      outDir: TEST_OUT_DIR,
    });

    expect(result.urlCount).toBe(2);

    const content = await Deno.readTextFile(result.outputPath);
    expect(content).toContain("<loc>https://example.com</loc>");
    expect(content).toContain("<loc>https://example.com/about</loc>");
    expect(content).not.toContain("/admin");
    expect(content).not.toContain("/draft");
  });

  it("normalizes baseUrl with trailing slash", async () => {
    const result = await generateSitemap({
      routes: ["/", "/about"],
      config: { baseUrl: "https://example.com/" },
      outDir: TEST_OUT_DIR,
    });

    const content = await Deno.readTextFile(result.outputPath);
    // Should not have double slashes
    expect(content).toContain("<loc>https://example.com</loc>");
    expect(content).toContain("<loc>https://example.com/about</loc>");
    expect(content).not.toContain("https://example.com//");
  });

  it("escapes special XML characters in URLs", async () => {
    const result = await generateSitemap({
      routes: ["/search?q=foo&bar=baz"],
      config: { baseUrl: "https://example.com" },
      outDir: TEST_OUT_DIR,
    });

    const content = await Deno.readTextFile(result.outputPath);
    expect(content).toContain("&amp;");
    expect(content).not.toContain("&bar");
  });

  it("handles empty routes array", async () => {
    const result = await generateSitemap({
      routes: [],
      config: { baseUrl: "https://example.com" },
      outDir: TEST_OUT_DIR,
    });

    expect(result.urlCount).toBe(0);

    const content = await Deno.readTextFile(result.outputPath);
    expect(content).toContain("<urlset");
    expect(content).toContain("</urlset>");
    expect(content).not.toContain("<url>");
  });

  it("handles routes with only system pages", async () => {
    const result = await generateSitemap({
      routes: ["/_not-found", "/_error"],
      config: { baseUrl: "https://example.com" },
      outDir: TEST_OUT_DIR,
    });

    expect(result.urlCount).toBe(0);
  });

  it("supports glob pattern with multiple segments", async () => {
    const result = await generateSitemap({
      routes: ["/", "/api/v1/users", "/api/v2/posts", "/about"],
      config: {
        baseUrl: "https://example.com",
        exclude: ["/api/*"],
      },
      outDir: TEST_OUT_DIR,
    });

    expect(result.urlCount).toBe(2);

    const content = await Deno.readTextFile(result.outputPath);
    expect(content).not.toContain("/api/");
  });

  it("writes sitemap.xml to correct path", async () => {
    const result = await generateSitemap({
      routes: ["/"],
      config: { baseUrl: "https://example.com" },
      outDir: TEST_OUT_DIR,
    });

    expect(result.outputPath).toBe(join(TEST_OUT_DIR, "sitemap.xml"));
  });
});

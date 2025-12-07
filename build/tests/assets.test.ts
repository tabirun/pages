import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { exists } from "@std/fs";
import {
  addHashToPath,
  copyAssetsWithHashes,
  createAssetMap,
  generateContentHash,
  shouldSkipHash,
} from "../assets.ts";
import { BuildError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
const TEST_OUT_DIR = join(FIXTURES_DIR, ".assets-test");

describe("shouldSkipHash", () => {
  it("returns true for robots.txt", () => {
    expect(shouldSkipHash("/robots.txt")).toBe(true);
  });

  it("returns true for sitemap.xml", () => {
    expect(shouldSkipHash("/sitemap.xml")).toBe(true);
  });

  it("returns true for favicon.ico", () => {
    expect(shouldSkipHash("/favicon.ico")).toBe(true);
  });

  it("returns true for .well-known files", () => {
    expect(shouldSkipHash("/.well-known/security.txt")).toBe(true);
    expect(shouldSkipHash("/.well-known/assetlinks.json")).toBe(true);
  });

  it("returns false for regular assets", () => {
    expect(shouldSkipHash("/images/logo.png")).toBe(false);
    expect(shouldSkipHash("/styles/main.css")).toBe(false);
    expect(shouldSkipHash("/script.js")).toBe(false);
  });

  it("returns false for similarly named files in subdirectories", () => {
    expect(shouldSkipHash("/assets/robots.txt")).toBe(false);
    expect(shouldSkipHash("/data/sitemap.xml")).toBe(false);
  });
});

describe("generateContentHash", () => {
  it("returns 8 character uppercase hash", async () => {
    const content = new TextEncoder().encode("test content");
    const hash = await generateContentHash(content);

    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[A-F0-9]+$/);
  });

  it("returns same hash for same content", async () => {
    const content = new TextEncoder().encode("same content");
    const hash1 = await generateContentHash(content);
    const hash2 = await generateContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different content", async () => {
    const content1 = new TextEncoder().encode("content 1");
    const content2 = new TextEncoder().encode("content 2");
    const hash1 = await generateContentHash(content1);
    const hash2 = await generateContentHash(content2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("addHashToPath", () => {
  it("adds hash before extension", () => {
    expect(addHashToPath("/logo.png", "A1B2C3D4")).toBe("/logo-A1B2C3D4.png");
  });

  it("handles files in subdirectories", () => {
    expect(addHashToPath("/images/logo.png", "A1B2C3D4")).toBe(
      "/images/logo-A1B2C3D4.png",
    );
  });

  it("handles deeply nested paths", () => {
    expect(addHashToPath("/assets/images/icons/logo.png", "A1B2C3D4")).toBe(
      "/assets/images/icons/logo-A1B2C3D4.png",
    );
  });

  it("handles files without extension", () => {
    expect(addHashToPath("/LICENSE", "A1B2C3D4")).toBe("/LICENSE-A1B2C3D4");
  });

  it("handles files at root", () => {
    expect(addHashToPath("/style.css", "A1B2C3D4")).toBe("/style-A1B2C3D4.css");
  });
});

describe("copyAssetsWithHashes", () => {
  beforeAll(async () => {
    try {
      await Deno.remove(TEST_OUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
    await Deno.mkdir(TEST_OUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      await Deno.remove(TEST_OUT_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  it("copies assets with content-based hashes", async () => {
    // Create a test asset that should be hashed
    const testAssetDir = join(TEST_OUT_DIR, "test-assets");
    await Deno.mkdir(testAssetDir, { recursive: true });
    const testAssetPath = join(testAssetDir, "test.txt");
    await Deno.writeTextFile(testAssetPath, "test content for hashing");

    const outDir = join(TEST_OUT_DIR, "hashed-output");
    await Deno.mkdir(outDir, { recursive: true });

    const result = await copyAssetsWithHashes({
      assets: [
        { filePath: testAssetPath, urlPath: "/test.txt" },
      ],
      outDir,
    });

    expect(result).toHaveLength(1);
    expect(result[0].originalPath).toBe("/test.txt");
    expect(result[0].hashedPath).toMatch(/^\/test-[A-F0-9]{8}\.txt$/);
    expect(result[0].wasHashed).toBe(true);

    // Verify file exists at hashed path
    const outputExists = await exists(result[0].outputPath);
    expect(outputExists).toBe(true);
  });

  it("copies robots.txt without hash", async () => {
    const publicDir = join(FIXTURES_DIR, "public");
    const robotsPath = join(publicDir, "robots.txt");

    const outDir = join(TEST_OUT_DIR, "no-hash-output");
    await Deno.mkdir(outDir, { recursive: true });

    const result = await copyAssetsWithHashes({
      assets: [
        { filePath: robotsPath, urlPath: "/robots.txt" },
      ],
      outDir,
    });

    expect(result).toHaveLength(1);
    expect(result[0].originalPath).toBe("/robots.txt");
    expect(result[0].hashedPath).toBe("/robots.txt");
    expect(result[0].wasHashed).toBe(false);

    // Verify file exists at original path
    const outputPath = join(outDir, "robots.txt");
    const outputExists = await exists(outputPath);
    expect(outputExists).toBe(true);
  });

  it("throws BuildError for invalid asset path", async () => {
    const testAssetDir = join(TEST_OUT_DIR, "invalid-test");
    await Deno.mkdir(testAssetDir, { recursive: true });
    const testAssetPath = join(testAssetDir, "test.txt");
    await Deno.writeTextFile(testAssetPath, "test");

    try {
      await copyAssetsWithHashes({
        assets: [
          { filePath: testAssetPath, urlPath: "/../escape.txt" },
        ],
        outDir: TEST_OUT_DIR,
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
    }
  });

  it("throws BuildError for non-existent file", async () => {
    try {
      await copyAssetsWithHashes({
        assets: [
          { filePath: "/non/existent/file.txt", urlPath: "/file.txt" },
        ],
        outDir: TEST_OUT_DIR,
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
      expect((error as BuildError).message).toContain("Failed to copy asset");
    }
  });
});

describe("createAssetMap", () => {
  it("creates map from hashed assets only", () => {
    const assets = [
      {
        originalPath: "/logo.png",
        hashedPath: "/logo-A1B2C3D4.png",
        outputPath: "/dist/logo-A1B2C3D4.png",
        wasHashed: true,
      },
      {
        originalPath: "/robots.txt",
        hashedPath: "/robots.txt",
        outputPath: "/dist/robots.txt",
        wasHashed: false,
      },
    ];

    const map = createAssetMap(assets);

    expect(map.size).toBe(1);
    expect(map.get("/logo.png")).toBe("/logo-A1B2C3D4.png");
    expect(map.has("/robots.txt")).toBe(false);
  });

  it("returns empty map for no hashed assets", () => {
    const assets = [
      {
        originalPath: "/robots.txt",
        hashedPath: "/robots.txt",
        outputPath: "/dist/robots.txt",
        wasHashed: false,
      },
    ];

    const map = createAssetMap(assets);
    expect(map.size).toBe(0);
  });
});

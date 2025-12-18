import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { compileCSS, injectStylesheet } from "../compiler.ts";
import { BuildError } from "../../build/types.ts";

let FIXTURES_DIR: string;
let TEST_OUT_DIR: string;

describe("injectStylesheet", () => {
  it("injects link tag before </head>", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`;
    const result = injectStylesheet(html, "/__styles/A1B2C3D4.css");

    expect(result).toContain(
      '<link rel="stylesheet" href="/__styles/A1B2C3D4.css">',
    );
    expect(result).toContain(
      '<link rel="stylesheet" href="/__styles/A1B2C3D4.css">\n</head>',
    );
  });

  it("injects at start of body if no head", () => {
    const html = `<body>
  <h1>Hello</h1>
</body>`;
    const result = injectStylesheet(html, "/__styles/A1B2C3D4.css");

    expect(result).toContain(
      '<link rel="stylesheet" href="/__styles/A1B2C3D4.css">',
    );
    expect(result).toContain("<body>\n<link");
  });

  it("preserves body attributes when injecting", () => {
    const html = `<body class="dark" id="app">
  <h1>Hello</h1>
</body>`;
    const result = injectStylesheet(html, "/__styles/A1B2C3D4.css");

    expect(result).toContain('<body class="dark" id="app">');
    expect(result).toContain(
      '<link rel="stylesheet" href="/__styles/A1B2C3D4.css">',
    );
  });

  it("prepends to document if no head or body", () => {
    const html = "<h1>Hello</h1>";
    const result = injectStylesheet(html, "/__styles/A1B2C3D4.css");

    expect(result.startsWith('<link rel="stylesheet"')).toBe(true);
  });

  it("returns unchanged HTML for empty path", () => {
    const html = "<html><head></head><body></body></html>";
    const result = injectStylesheet(html, "");

    expect(result).toBe(html);
  });

  it("throws error for invalid path format", () => {
    const html = "<html><head></head><body></body></html>";

    expect(() => injectStylesheet(html, "/malicious.css")).toThrow(
      "Invalid CSS path format",
    );
    expect(() => injectStylesheet(html, "/__styles/lowercase.css")).toThrow(
      "Invalid CSS path format",
    );
    expect(() =>
      injectStylesheet(html, '/__styles/A1B2C3D4.css" onload="alert(1)')
    ).toThrow("Invalid CSS path format");
  });

  it("accepts paths with basePath prefix", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`;
    const result = injectStylesheet(html, "/docs/__styles/A1B2C3D4.css");

    expect(result).toContain(
      '<link rel="stylesheet" href="/docs/__styles/A1B2C3D4.css">',
    );
    expect(result).toContain(
      '<link rel="stylesheet" href="/docs/__styles/A1B2C3D4.css">\n</head>',
    );
  });

  it("accepts paths with multi-segment basePath prefix", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`;
    const result = injectStylesheet(html, "/my-docs/v1/__styles/A1B2C3D4.css");

    expect(result).toContain(
      '<link rel="stylesheet" href="/my-docs/v1/__styles/A1B2C3D4.css">',
    );
  });

  it("accepts root paths without basePath", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`;
    const result = injectStylesheet(html, "/__styles/A1B2C3D4.css");

    expect(result).toContain(
      '<link rel="stylesheet" href="/__styles/A1B2C3D4.css">',
    );
  });
});

describe("compileCSS", () => {
  beforeAll(async () => {
    // Use system temp directory for fixtures (avoids breaking coverage)
    FIXTURES_DIR = await Deno.makeTempDir({ prefix: "css-compiler-test-" });
    TEST_OUT_DIR = join(FIXTURES_DIR, ".dist-test");

    // Create fixtures directory
    await Deno.mkdir(join(FIXTURES_DIR, "styles"), { recursive: true });

    // Create deno.json with PostCSS import for subprocess
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "deno.json"),
      JSON.stringify(
        {
          imports: {
            "postcss": "npm:postcss@^8.4.47",
          },
        },
        null,
        2,
      ),
    );

    // Create minimal postcss.config.ts that passes CSS through unchanged
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "postcss.config.ts"),
      `export default {
  plugins: [],
};
`,
    );

    // Create CSS entry file
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "styles/index.css"),
      `.button {
  padding: 0.5rem 1rem;
  background-color: blue;
  color: white;
}

.heading {
  font-size: 2rem;
  font-weight: bold;
}
`,
    );
  });

  afterAll(() => {
    // Temp directories are cleaned up by the OS, no need to remove
  });

  it("compiles CSS from entry file", async () => {
    await Deno.mkdir(TEST_OUT_DIR, { recursive: true });

    const result = await compileCSS({
      entryPath: join(FIXTURES_DIR, "styles/index.css"),
      configPath: join(FIXTURES_DIR, "postcss.config.ts"),
      outDir: TEST_OUT_DIR,
      projectConfig: join(FIXTURES_DIR, "deno.json"),
    });

    expect(result.css).toContain(".button");
    expect(result.css).toContain("padding");
    expect(result.css).toContain("background-color");
    expect(result.css).toContain(".heading");
    expect(result.css).toContain("font-size");
    expect(result.publicPath).toMatch(/^\/__styles\/[A-F0-9]{8}\.css$/);

    // Verify file was written
    const fileExists = await exists(result.outputPath);
    expect(fileExists).toBe(true);
  });

  it("returns empty result when entry file is empty", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "css-empty-test-" });
    await Deno.mkdir(join(tempDir, "styles"), { recursive: true });

    // Create deno.json with PostCSS
    await Deno.writeTextFile(
      join(tempDir, "deno.json"),
      JSON.stringify({ imports: { "postcss": "npm:postcss@^8.4.47" } }),
    );

    // Create empty CSS file
    await Deno.writeTextFile(join(tempDir, "styles/empty.css"), "");

    // Create postcss config
    await Deno.writeTextFile(
      join(tempDir, "postcss.config.ts"),
      `export default { plugins: [] };`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    const result = await compileCSS({
      entryPath: join(tempDir, "styles/empty.css"),
      configPath: join(tempDir, "postcss.config.ts"),
      outDir,
      projectConfig: join(tempDir, "deno.json"),
    });

    expect(result.css).toBe("");
    expect(result.publicPath).toBe("");
    expect(result.outputPath).toBe("");
  });

  it("returns empty result when entry file contains only whitespace", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "css-whitespace-test-" });
    await Deno.mkdir(join(tempDir, "styles"), { recursive: true });

    // Create deno.json with PostCSS
    await Deno.writeTextFile(
      join(tempDir, "deno.json"),
      JSON.stringify({ imports: { "postcss": "npm:postcss@^8.4.47" } }),
    );

    // Create CSS file with only whitespace
    await Deno.writeTextFile(
      join(tempDir, "styles/whitespace.css"),
      "\n\n   \n\t\n",
    );

    // Create postcss config
    await Deno.writeTextFile(
      join(tempDir, "postcss.config.ts"),
      `export default { plugins: [] };`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    const result = await compileCSS({
      entryPath: join(tempDir, "styles/whitespace.css"),
      configPath: join(tempDir, "postcss.config.ts"),
      outDir,
      projectConfig: join(tempDir, "deno.json"),
    });

    expect(result.css).toBe("");
    expect(result.publicPath).toBe("");
    expect(result.outputPath).toBe("");
  });

  it("throws BuildError for invalid config path", async () => {
    try {
      await compileCSS({
        entryPath: join(FIXTURES_DIR, "styles/index.css"),
        configPath: "/nonexistent/postcss.config.ts",
        outDir: TEST_OUT_DIR,
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
      expect((error as BuildError).message).toContain("CSS compilation failed");
    }
  });

  it("throws BuildError for invalid entry path", async () => {
    try {
      await compileCSS({
        entryPath: "/nonexistent/styles.css",
        configPath: join(FIXTURES_DIR, "postcss.config.ts"),
        outDir: TEST_OUT_DIR,
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
      expect((error as BuildError).message).toContain("CSS compilation failed");
    }
  });

  it("wraps filesystem errors in BuildError", async () => {
    // Use /dev/null as outDir to trigger a filesystem error
    // when trying to create __styles directory
    try {
      await compileCSS({
        entryPath: join(FIXTURES_DIR, "styles/index.css"),
        configPath: join(FIXTURES_DIR, "postcss.config.ts"),
        outDir: "/dev/null/invalid",
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
      expect((error as BuildError).message).toContain("CSS compilation failed");
    }
  });

  it("generates publicPath without basePath prefix when basePath not provided", async () => {
    await Deno.mkdir(TEST_OUT_DIR, { recursive: true });

    const result = await compileCSS({
      entryPath: join(FIXTURES_DIR, "styles/index.css"),
      configPath: join(FIXTURES_DIR, "postcss.config.ts"),
      outDir: TEST_OUT_DIR,
      projectConfig: join(FIXTURES_DIR, "deno.json"),
    });

    expect(result.publicPath).toMatch(/^\/__styles\/[A-F0-9]{8}\.css$/);
    expect(result.publicPath.startsWith("/__styles/")).toBe(true);
  });

  it("generates publicPath with basePath prefix when basePath is /docs", async () => {
    await Deno.mkdir(TEST_OUT_DIR, { recursive: true });

    const result = await compileCSS({
      entryPath: join(FIXTURES_DIR, "styles/index.css"),
      configPath: join(FIXTURES_DIR, "postcss.config.ts"),
      outDir: TEST_OUT_DIR,
      basePath: "/docs",
      projectConfig: join(FIXTURES_DIR, "deno.json"),
    });

    expect(result.publicPath).toMatch(/^\/docs\/__styles\/[A-F0-9]{8}\.css$/);
    expect(result.publicPath.startsWith("/docs/__styles/")).toBe(true);
  });

  it("generates publicPath with multi-segment basePath prefix", async () => {
    await Deno.mkdir(TEST_OUT_DIR, { recursive: true });

    const result = await compileCSS({
      entryPath: join(FIXTURES_DIR, "styles/index.css"),
      configPath: join(FIXTURES_DIR, "postcss.config.ts"),
      outDir: TEST_OUT_DIR,
      basePath: "/my-docs/v1",
      projectConfig: join(FIXTURES_DIR, "deno.json"),
    });

    expect(result.publicPath).toMatch(
      /^\/my-docs\/v1\/__styles\/[A-F0-9]{8}\.css$/,
    );
    expect(result.publicPath.startsWith("/my-docs/v1/__styles/")).toBe(true);
  });

  it("uses empty config when no default export", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "css-no-default-" });
    await Deno.mkdir(join(tempDir, "styles"), { recursive: true });

    // Create deno.json with PostCSS
    await Deno.writeTextFile(
      join(tempDir, "deno.json"),
      JSON.stringify({ imports: { "postcss": "npm:postcss@^8.4.47" } }),
    );

    // Config with no default export
    await Deno.writeTextFile(
      join(tempDir, "postcss.config.ts"),
      `export const plugins = [];`,
    );

    // Create simple CSS file
    await Deno.writeTextFile(
      join(tempDir, "styles/index.css"),
      `.test { color: red; }`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    // Should not throw, uses empty config fallback
    const result = await compileCSS({
      entryPath: join(tempDir, "styles/index.css"),
      configPath: join(tempDir, "postcss.config.ts"),
      outDir,
      projectConfig: join(tempDir, "deno.json"),
    });

    // With empty config (no plugins), CSS is still compiled
    expect(result.css).toContain(".test");
    expect(result.css).toContain("color");
  });

  it("processes CSS with valid PostCSS plugins config", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "css-plugins-test-" });
    await Deno.mkdir(join(tempDir, "styles"), { recursive: true });

    // Create deno.json with PostCSS
    await Deno.writeTextFile(
      join(tempDir, "deno.json"),
      JSON.stringify({ imports: { "postcss": "npm:postcss@^8.4.47" } }),
    );

    // Create config with empty plugins array (valid PostCSS config)
    await Deno.writeTextFile(
      join(tempDir, "postcss.config.ts"),
      `export default {
  plugins: [],
};`,
    );

    // Create CSS file with multiple rules
    await Deno.writeTextFile(
      join(tempDir, "styles/index.css"),
      `.container {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    const result = await compileCSS({
      entryPath: join(tempDir, "styles/index.css"),
      configPath: join(tempDir, "postcss.config.ts"),
      outDir,
      projectConfig: join(tempDir, "deno.json"),
    });

    expect(result.css).toContain(".container");
    expect(result.css).toContain("max-width");
    expect(result.css).toContain(".card");
    expect(result.css).toContain("border-radius");
    expect(result.publicPath).toMatch(/^\/__styles\/[A-F0-9]{8}\.css$/);
  });

  it("generates different hashes for different CSS content", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "css-hash-test-" });
    await Deno.mkdir(join(tempDir, "styles"), { recursive: true });

    // Create deno.json with PostCSS
    await Deno.writeTextFile(
      join(tempDir, "deno.json"),
      JSON.stringify({ imports: { "postcss": "npm:postcss@^8.4.47" } }),
    );

    // Create postcss config
    await Deno.writeTextFile(
      join(tempDir, "postcss.config.ts"),
      `export default { plugins: [] };`,
    );

    // First CSS file
    await Deno.writeTextFile(
      join(tempDir, "styles/first.css"),
      `.first { color: red; }`,
    );

    // Second CSS file with different content
    await Deno.writeTextFile(
      join(tempDir, "styles/second.css"),
      `.second { color: blue; }`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    const result1 = await compileCSS({
      entryPath: join(tempDir, "styles/first.css"),
      configPath: join(tempDir, "postcss.config.ts"),
      outDir,
      projectConfig: join(tempDir, "deno.json"),
    });

    const result2 = await compileCSS({
      entryPath: join(tempDir, "styles/second.css"),
      configPath: join(tempDir, "postcss.config.ts"),
      outDir,
      projectConfig: join(tempDir, "deno.json"),
    });

    // Different content should produce different hashes
    expect(result1.publicPath).not.toBe(result2.publicPath);
    expect(result1.outputPath).not.toBe(result2.outputPath);

    // Both files should exist
    expect(await exists(result1.outputPath)).toBe(true);
    expect(await exists(result2.outputPath)).toBe(true);
  });
});

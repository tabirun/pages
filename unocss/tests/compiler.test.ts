import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { compileUnoCSS, injectStylesheet } from "../compiler.ts";
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
});

describe("compileUnoCSS", () => {
  beforeAll(async () => {
    // Use system temp directory for fixtures (avoids breaking coverage)
    FIXTURES_DIR = await Deno.makeTempDir({ prefix: "unocss-compiler-test-" });
    TEST_OUT_DIR = join(FIXTURES_DIR, ".dist-test");

    // Create fixtures directory
    await Deno.mkdir(join(FIXTURES_DIR, "pages"), { recursive: true });

    // Create uno.config.ts
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "uno.config.ts"),
      `export default {
  rules: [
    ["m-1", { margin: "0.25rem" }],
    ["p-2", { padding: "0.5rem" }],
    ["text-red", { color: "red" }],
  ],
};
`,
    );

    // Create a page with classes
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/index.tsx"),
      `export default function Page() {
  return <div class="m-1 p-2 text-red">Hello</div>;
}
`,
    );
  });

  afterAll(() => {
    // Temp directories are cleaned up by the OS, no need to remove
  });

  it("compiles UnoCSS from source files", async () => {
    await Deno.mkdir(TEST_OUT_DIR, { recursive: true });

    const result = await compileUnoCSS({
      configPath: join(FIXTURES_DIR, "uno.config.ts"),
      projectRoot: FIXTURES_DIR,
      outDir: TEST_OUT_DIR,
    });

    expect(result.css).toContain("margin");
    expect(result.css).toContain("padding");
    expect(result.css).toContain("color");
    expect(result.publicPath).toMatch(/^\/__styles\/[A-F0-9]{8}\.css$/);

    // Verify file was written
    const fileExists = await exists(result.outputPath);
    expect(fileExists).toBe(true);
  });

  it("returns empty result when no classes found", async () => {
    // Use system temp directory for dynamic fixtures (avoids breaking coverage)
    const tempDir = await Deno.makeTempDir({ prefix: "unocss-test-" });

    await Deno.mkdir(join(tempDir, "pages"), { recursive: true });

    await Deno.writeTextFile(
      join(tempDir, "uno.config.ts"),
      `export default {};`,
    );

    await Deno.writeTextFile(
      join(tempDir, "pages/index.tsx"),
      `export default function Page() {
  return <div>No classes here</div>;
}
`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    const result = await compileUnoCSS({
      configPath: join(tempDir, "uno.config.ts"),
      projectRoot: tempDir,
      outDir,
    });

    expect(result.css).toBe("");
    expect(result.publicPath).toBe("");
    expect(result.outputPath).toBe("");
  });

  it("throws BuildError for invalid config path", async () => {
    try {
      await compileUnoCSS({
        configPath: "/nonexistent/uno.config.ts",
        projectRoot: FIXTURES_DIR,
        outDir: TEST_OUT_DIR,
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
      expect((error as BuildError).message).toContain("Failed to load UnoCSS");
    }
  });

  it("wraps filesystem errors in BuildError", async () => {
    // Use /dev/null as outDir to trigger a filesystem error (not a BuildError)
    // when trying to create __styles directory
    try {
      await compileUnoCSS({
        configPath: join(FIXTURES_DIR, "uno.config.ts"),
        projectRoot: FIXTURES_DIR,
        outDir: "/dev/null/invalid",
      });
      throw new Error("Should have thrown");
    } catch (error) {
      if (error instanceof Error && error.message === "Should have thrown") {
        throw error;
      }
      expect(error).toBeInstanceOf(BuildError);
      expect((error as BuildError).message).toContain(
        "UnoCSS compilation failed",
      );
    }
  });

  it("uses empty config when no default export", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "unocss-no-default-" });
    await Deno.mkdir(join(tempDir, "pages"), { recursive: true });

    // Config with no default export
    await Deno.writeTextFile(
      join(tempDir, "uno.config.ts"),
      `export const rules = [];`,
    );

    await Deno.writeTextFile(
      join(tempDir, "pages/index.tsx"),
      `export default function Page() { return <div>Test</div>; }`,
    );

    const outDir = join(tempDir, ".dist");
    await Deno.mkdir(outDir, { recursive: true });

    // Should not throw, uses empty config fallback
    const result = await compileUnoCSS({
      configPath: join(tempDir, "uno.config.ts"),
      projectRoot: tempDir,
      outDir,
    });

    // With empty config, no CSS is generated
    expect(result.css).toBe("");
  });
});

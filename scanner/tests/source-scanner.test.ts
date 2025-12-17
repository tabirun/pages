import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { scanSourceContent } from "../source-scanner.ts";

let FIXTURES_DIR: string;

describe("scanSourceContent", () => {
  beforeAll(async () => {
    // Use system temp directory for fixtures (avoids breaking coverage)
    FIXTURES_DIR = await Deno.makeTempDir({ prefix: "source-scanner-test-" });

    // Create fixtures directory structure
    await Deno.mkdir(join(FIXTURES_DIR, "pages/nested"), { recursive: true });
    await Deno.mkdir(join(FIXTURES_DIR, "node_modules/some-package"), {
      recursive: true,
    });
    await Deno.mkdir(join(FIXTURES_DIR, ".tabi"), { recursive: true });
    await Deno.mkdir(join(FIXTURES_DIR, "components"), { recursive: true });

    // Create source files with identifiable content
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/index.tsx"),
      `export default function Index() { return <div class="m-1">Index</div>; }`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/about.ts"),
      `export const title = "About page with p-2 class";`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/nested/page.jsx"),
      `export default () => <div class="text-red">Nested JSX</div>;`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/content.md"),
      `# Markdown with class="flex"`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/template.html"),
      `<div class="grid">HTML template</div>`,
    );

    // Create test files that should be skipped
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/index.test.ts"),
      `test("should be skipped");`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, "pages/about.spec.tsx"),
      `describe("should be skipped");`,
    );

    // Create root-level files that should be scanned
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "dev.ts"),
      `const config = { wrapperClassName: "prose dark:prose-invert" };`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, "components/header.tsx"),
      `export function Header() { return <header class="bg-blue">Header</header>; }`,
    );

    // Create files in directories that should be skipped
    await Deno.writeTextFile(
      join(FIXTURES_DIR, "node_modules/some-package/index.ts"),
      `export const nodeModulesContent = "should-not-scan-node-modules";`,
    );

    await Deno.writeTextFile(
      join(FIXTURES_DIR, ".tabi/cache.ts"),
      `export const tabiContent = "should-not-scan-tabi";`,
    );
  });

  afterAll(() => {
    // Temp directories are cleaned up by the OS, no need to remove
  });

  it("scans .tsx files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("m-1");
    expect(content).toContain("Index");
  });

  it("scans .ts files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("p-2");
    expect(content).toContain("About page");
  });

  it("scans .jsx files in nested directories", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("text-red");
    expect(content).toContain("Nested JSX");
  });

  it("scans .md files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("flex");
    expect(content).toContain("Markdown");
  });

  it("scans .html files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("grid");
    expect(content).toContain("HTML template");
  });

  it("skips .test. files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).not.toContain("should be skipped");
  });

  it("skips .spec. files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).not.toContain("describe");
  });

  it("scans root-level .ts files", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("prose");
    expect(content).toContain("prose-invert");
  });

  it("scans files in non-pages directories like components", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).toContain("bg-blue");
    expect(content).toContain("Header");
  });

  it("skips node_modules directory", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).not.toContain("should-not-scan-node-modules");
  });

  it("skips .tabi directory", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    expect(content).not.toContain("should-not-scan-tabi");
  });

  it("returns empty string for missing project root", async () => {
    const content = await scanSourceContent("/nonexistent/path");
    expect(content).toBe("");
  });

  it("returns empty string for empty project root", async () => {
    const emptyDir = await Deno.makeTempDir({
      prefix: "source-scanner-empty-",
    });

    const content = await scanSourceContent(emptyDir);
    expect(content).toBe("");
  });

  it("concatenates multiple files with newlines", async () => {
    const content = await scanSourceContent(FIXTURES_DIR);
    // Content from multiple files should be joined
    expect(content.split("\n").length).toBeGreaterThan(1);
  });
});

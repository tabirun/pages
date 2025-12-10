import { expect } from "@std/expect";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { exists } from "@std/fs";
import { join } from "@std/path";

const CLI_PATH = new URL("../build.ts", import.meta.url).pathname;
const FIXTURE_DIR = new URL("./fixtures/build-test", import.meta.url).pathname;
const PAGES_DIR = join(FIXTURE_DIR, "pages");
const OUT_DIR = join(FIXTURE_DIR, "dist");

async function runBuildCli(
  args: string[],
  cwd?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "--allow-run",
      CLI_PATH,
      ...args,
    ],
    cwd: cwd ?? FIXTURE_DIR,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

describe("build CLI", () => {
  beforeEach(async () => {
    // Create fixture directory structure
    await Deno.mkdir(PAGES_DIR, { recursive: true });

    // Create a minimal page
    await Deno.writeTextFile(
      join(PAGES_DIR, "index.tsx"),
      `export default function Home() {
  return <div>Hello World</div>;
}
`,
    );
  });

  afterEach(async () => {
    // Clean up fixture directory
    try {
      await Deno.remove(FIXTURE_DIR, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe("--help", () => {
    it("shows help text with --help flag", async () => {
      const { code, stdout } = await runBuildCli(["--help"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Tabi Pages - Build Command");
      expect(stdout).toContain("USAGE:");
      expect(stdout).toContain("OPTIONS:");
      expect(stdout).toContain("--pages-dir");
      expect(stdout).toContain("--out-dir");
      expect(stdout).toContain("--base-path");
      expect(stdout).toContain("--base-url");
      expect(stdout).toContain("PERMISSIONS:");
      expect(stdout).toContain("EXAMPLES:");
    });

    it("shows help text with -h flag", async () => {
      const { code, stdout } = await runBuildCli(["-h"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Tabi Pages - Build Command");
    });
  });

  describe("build execution", () => {
    it("builds site with default options", async () => {
      const { code, stdout } = await runBuildCli([]);

      expect(code).toBe(0);
      expect(stdout).toContain("Building site from ./pages to ./dist");
      expect(stdout).toContain("Build complete!");
      expect(stdout).toContain("Tabi Pages"); // Logger source prefix

      // Verify output was created
      expect(await exists(OUT_DIR)).toBe(true);
      expect(await exists(join(OUT_DIR, "index.html"))).toBe(true);
    });

    it("builds site with custom pages-dir", async () => {
      // Create custom pages directory
      const customPagesDir = join(FIXTURE_DIR, "content");
      await Deno.mkdir(customPagesDir, { recursive: true });
      await Deno.writeTextFile(
        join(customPagesDir, "index.tsx"),
        `export default function Home() {
  return <div>Custom Content</div>;
}
`,
      );

      const { code, stdout } = await runBuildCli([
        "--pages-dir",
        "./content",
      ]);

      expect(code).toBe(0);
      expect(stdout).toContain("Building site from ./content to ./dist");
      expect(stdout).toContain("Build complete!");
    });

    it("builds site with custom out-dir", async () => {
      const customOutDir = join(FIXTURE_DIR, "public");

      const { code, stdout } = await runBuildCli(["--out-dir", "./public"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Building site from ./pages to ./public");
      expect(stdout).toContain("Build complete!");
      expect(await exists(customOutDir)).toBe(true);
    });

    it("builds site with short flags", async () => {
      const { code, stdout } = await runBuildCli([
        "-p",
        "./pages",
        "-o",
        "./dist",
      ]);

      expect(code).toBe(0);
      expect(stdout).toContain("Build complete!");
    });

    it("builds site with base-path option", async () => {
      const { code, stdout } = await runBuildCli(["--base-path", "/docs"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Build complete!");
    });

    it("builds site with base-url option", async () => {
      const { code, stdout } = await runBuildCli([
        "--base-url",
        "https://example.com",
      ]);

      expect(code).toBe(0);
      expect(stdout).toContain("Build complete!");
    });
  });

  describe("error handling", () => {
    it("exits with error for unknown option", async () => {
      const { code, stderr } = await runBuildCli(["--unknown-option", "value"]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("Unknown option");
    });

    it("exits with error for path traversal in pages-dir", async () => {
      const { code, stderr } = await runBuildCli([
        "--pages-dir",
        "../../../etc",
      ]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("path traversal");
    });

    it("exits with error for path traversal in out-dir", async () => {
      const { code, stderr } = await runBuildCli(["--out-dir", "../output"]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("path traversal");
    });

    it("exits with error for absolute path in pages-dir", async () => {
      const { code, stderr } = await runBuildCli([
        "--pages-dir",
        "/absolute/path",
      ]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("relative path");
    });

    it("exits with error for absolute path in out-dir", async () => {
      const { code, stderr } = await runBuildCli(["--out-dir", "/tmp/output"]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("relative path");
    });
  });
});

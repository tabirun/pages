import { expect } from "@std/expect";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { delay } from "@std/async";

const CLI_PATH = new URL("../serve.ts", import.meta.url).pathname;
const FIXTURE_DIR = new URL("./fixtures/serve-test", import.meta.url).pathname;
const DIST_DIR = join(FIXTURE_DIR, "dist");

async function runServeCliWithOutput(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-env",
      CLI_PATH,
      ...args,
    ],
    cwd: FIXTURE_DIR,
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

async function runServeCliWithTimeout(
  args: string[],
  timeout: number,
): Promise<{ stdout: string; stderr: string }> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-env",
      CLI_PATH,
      ...args,
    ],
    cwd: FIXTURE_DIR,
    stdout: "piped",
    stderr: "piped",
  });

  const child = command.spawn();

  // Give the server time to start
  await delay(timeout);

  // Send SIGTERM to trigger graceful shutdown
  try {
    child.kill("SIGTERM");
  } catch {
    // Process may have already exited
  }

  // Wait for process to finish
  const { stdout, stderr } = await child.output();

  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

describe("serve CLI", () => {
  beforeEach(async () => {
    // Create fixture directory with pre-built content
    await Deno.mkdir(DIST_DIR, { recursive: true });

    // Create a simple index.html
    await Deno.writeTextFile(
      join(DIST_DIR, "index.html"),
      "<!DOCTYPE html><html><body>Hello World</body></html>",
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
      const { code, stdout } = await runServeCliWithOutput(["--help"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Tabi Pages - Serve Command");
      expect(stdout).toContain("USAGE:");
      expect(stdout).toContain("OPTIONS:");
      expect(stdout).toContain("--dir");
      expect(stdout).toContain("--port");
      expect(stdout).toContain("--base-path");
      expect(stdout).toContain("PERMISSIONS:");
      expect(stdout).toContain("EXAMPLES:");
    });

    it("shows help text with -h flag", async () => {
      const { code, stdout } = await runServeCliWithOutput(["-h"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Tabi Pages - Serve Command");
    });
  });

  describe("server startup", () => {
    it("starts server with default options", async () => {
      const { stdout } = await runServeCliWithTimeout([], 500);

      expect(stdout).toContain("Serving ./dist at http://localhost:3000");
      expect(stdout).toContain("Tabi Pages");
    });

    it("starts server with custom port", async () => {
      const { stdout } = await runServeCliWithTimeout(["--port", "8080"], 500);

      expect(stdout).toContain("http://localhost:8080");
    });

    it("starts server with custom dir", async () => {
      const { stdout } = await runServeCliWithTimeout(["--dir", "./dist"], 500);

      expect(stdout).toContain("Serving ./dist");
    });

    it("starts server with short flags", async () => {
      const { stdout } = await runServeCliWithTimeout(
        ["-d", "./dist", "-p", "4000"],
        500,
      );

      expect(stdout).toContain("Serving ./dist at http://localhost:4000");
    });

    it("handles graceful shutdown on SIGTERM", async () => {
      const { stdout } = await runServeCliWithTimeout([], 500);

      expect(stdout).toContain("Shutting down");
    });

    it("serves static files over HTTP", async () => {
      const port = 9876; // Use non-standard port to avoid conflicts

      const command = new Deno.Command("deno", {
        args: [
          "run",
          "--allow-net",
          "--allow-read",
          "--allow-env",
          CLI_PATH,
          "--port",
          String(port),
        ],
        cwd: FIXTURE_DIR,
        stdout: "piped",
        stderr: "piped",
      });

      const child = command.spawn();

      // Wait for server to start
      await delay(500);

      try {
        // Make HTTP request
        const response = await fetch(`http://localhost:${port}/`);
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(html).toContain("Hello World");
      } finally {
        child.kill("SIGTERM");
        await child.output();
      }
    });
  });

  describe("error handling", () => {
    it("exits with error for unknown option", async () => {
      const { code, stderr } = await runServeCliWithOutput([
        "--unknown-option",
        "value",
      ]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("Unknown option");
    });

    it("exits with error for invalid port", async () => {
      const { code, stderr } = await runServeCliWithOutput([
        "--port",
        "invalid",
      ]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("Invalid port");
    });

    it("exits with error for port out of range", async () => {
      const { code, stderr } = await runServeCliWithOutput(["--port", "99999"]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("Invalid port");
    });

    it("exits with error for path traversal in dir", async () => {
      const { code, stderr } = await runServeCliWithOutput([
        "--dir",
        "../../../etc",
      ]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("path traversal");
    });

    it("exits with error for absolute path in dir", async () => {
      const { code, stderr } = await runServeCliWithOutput([
        "--dir",
        "/tmp/dist",
      ]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("relative path");
    });
  });
});

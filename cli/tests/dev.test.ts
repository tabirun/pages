import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";

const CLI_PATH = new URL("../dev.ts", import.meta.url).pathname;

async function runDevCli(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-all",
      CLI_PATH,
      ...args,
    ],
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

describe("dev CLI", () => {
  describe("--help", () => {
    it("shows help text with --help flag", async () => {
      const { code, stdout } = await runDevCli(["--help"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Tabi Pages - Dev Command");
      expect(stdout).toContain("USAGE:");
      expect(stdout).toContain("OPTIONS:");
      expect(stdout).toContain("--pages-dir");
      expect(stdout).toContain("--port");
      expect(stdout).toContain("PERMISSIONS:");
      expect(stdout).toContain("EXAMPLES:");
    });

    it("shows help text with -h flag", async () => {
      const { code, stdout } = await runDevCli(["-h"]);

      expect(code).toBe(0);
      expect(stdout).toContain("Tabi Pages - Dev Command");
    });
  });

  describe("stub behavior", () => {
    it("exits with error when run without help flag", async () => {
      const { code, stderr } = await runDevCli([]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("not yet implemented");
    });

    it("shows helpful message about using build and serve", async () => {
      const { stderr } = await runDevCli([]);

      expect(stderr).toContain("build");
      expect(stderr).toContain("serve");
      expect(stderr).toContain("jsr:@tabirun/pages/build");
      expect(stderr).toContain("jsr:@tabirun/pages/serve");
    });
  });

  describe("error handling", () => {
    it("exits with error for unknown option", async () => {
      const { code, stderr } = await runDevCli(["--unknown-option", "value"]);

      expect(code).toBe(1);
      expect(stderr).toContain("Error:");
      expect(stderr).toContain("Unknown option");
    });
  });
});

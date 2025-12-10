import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";

// We can't directly test exitWithError and handleError since they call Deno.exit()
// Instead, test them via subprocess execution

const ERROR_TEST_SCRIPT = `
import { exitWithError, handleError } from "../error.ts";

const testType = Deno.args[0];

if (testType === "exitWithError") {
  exitWithError("test error message");
} else if (testType === "handleError-Error") {
  handleError(new Error("error instance message"));
} else if (testType === "handleError-string") {
  handleError("string error");
} else if (testType === "handleError-unknown") {
  handleError({ custom: "object" });
}
`;

async function runErrorTest(
  testType: string,
): Promise<{ code: number; stderr: string }> {
  // Write temporary test script
  const scriptPath = new URL("./error-runner.ts", import.meta.url).pathname;
  await Deno.writeTextFile(scriptPath, ERROR_TEST_SCRIPT);

  try {
    const command = new Deno.Command("deno", {
      args: ["run", "--allow-read", scriptPath, testType],
      cwd: new URL("./", import.meta.url).pathname,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await command.output();

    return {
      code,
      stderr: new TextDecoder().decode(stderr),
    };
  } finally {
    // Clean up
    await Deno.remove(scriptPath);
  }
}

describe("exitWithError", () => {
  it("prints error message to stderr and exits with code 1", async () => {
    const { code, stderr } = await runErrorTest("exitWithError");

    expect(code).toBe(1);
    expect(stderr).toContain("Error: test error message");
  });
});

describe("handleError", () => {
  it("handles Error instances", async () => {
    const { code, stderr } = await runErrorTest("handleError-Error");

    expect(code).toBe(1);
    expect(stderr).toContain("Error: error instance message");
  });

  it("handles string errors", async () => {
    const { code, stderr } = await runErrorTest("handleError-string");

    expect(code).toBe(1);
    expect(stderr).toContain("Error: string error");
  });

  it("handles unknown error types", async () => {
    const { code, stderr } = await runErrorTest("handleError-unknown");

    expect(code).toBe(1);
    expect(stderr).toContain("Error: [object Object]");
  });
});

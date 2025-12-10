import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { generateHelpText, printHelp } from "../help.ts";
import type { CliCommand } from "../types.ts";

const testCommand: CliCommand = {
  name: "build",
  description: "Build a static site from your pages.",
  usage:
    "deno run --allow-read --allow-write jsr:@tabirun/pages/build [OPTIONS]",
  options: [
    {
      short: "p",
      long: "pages-dir",
      description: "Pages directory",
      default: "./pages",
    },
    {
      short: "o",
      long: "out-dir",
      description: "Output directory",
      default: "./dist",
    },
    {
      long: "base-path",
      description: "Base path for hosting at a subpath",
    },
    {
      long: "required-opt",
      description: "A required option",
      required: true,
    },
  ],
  permissions: "--allow-read --allow-write --allow-env --allow-run",
  examples: [
    "deno run --allow-read --allow-write jsr:@tabirun/pages/build",
    "deno run --allow-read --allow-write jsr:@tabirun/pages/build --out-dir ./public",
  ],
};

describe("generateHelpText", () => {
  it("includes command name in title", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("Tabi Pages - Build Command");
  });

  it("includes command description", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("Build a static site from your pages.");
  });

  it("includes usage section", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("USAGE:");
    expect(help).toContain(
      "deno run --allow-read --allow-write jsr:@tabirun/pages/build [OPTIONS]",
    );
  });

  it("includes options section with short and long flags", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("OPTIONS:");
    expect(help).toContain("-p, --pages-dir");
    expect(help).toContain("-o, --out-dir");
    expect(help).toContain("--base-path");
  });

  it("includes default values for options", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("(default: ./pages)");
    expect(help).toContain("(default: ./dist)");
  });

  it("marks required options", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("--required-opt [required]");
  });

  it("includes help option automatically", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("-h, --help");
    expect(help).toContain("Show this help message");
  });

  it("includes permissions section", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("PERMISSIONS:");
    expect(help).toContain(
      "--allow-read --allow-write --allow-env --allow-run",
    );
  });

  it("includes examples section", () => {
    const help = generateHelpText(testCommand);

    expect(help).toContain("EXAMPLES:");
    expect(help).toContain(
      "deno run --allow-read --allow-write jsr:@tabirun/pages/build",
    );
    expect(help).toContain(
      "deno run --allow-read --allow-write jsr:@tabirun/pages/build --out-dir ./public",
    );
  });

  it("omits examples section when empty", () => {
    const commandWithoutExamples: CliCommand = {
      ...testCommand,
      examples: [],
    };
    const help = generateHelpText(commandWithoutExamples);

    expect(help).not.toContain("EXAMPLES:");
  });
});

describe("printHelp", () => {
  it("prints help text to console", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg: string) => {
      output = msg;
    };

    printHelp(testCommand);

    console.log = originalLog;
    expect(output).toContain("Tabi Pages - Build Command");
  });
});

import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { parseArgs, validateRequiredArgs } from "../args.ts";
import type { CliOption } from "../types.ts";

const testOptions: CliOption[] = [
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
    description: "Base path",
  },
];

const requiredOptions: CliOption[] = [
  {
    long: "required-opt",
    description: "A required option",
    required: true,
  },
];

describe("parseArgs", () => {
  describe("defaults", () => {
    it("returns defaults when no args provided", () => {
      const result = parseArgs([], testOptions);

      expect(result.help).toBe(false);
      expect(result.values["pages-dir"]).toBe("./pages");
      expect(result.values["out-dir"]).toBe("./dist");
      expect(result.positional).toEqual([]);
    });
  });

  describe("long flags", () => {
    it("parses long flags with space separator", () => {
      const result = parseArgs(
        ["--pages-dir", "./content", "--out-dir", "./public"],
        testOptions,
      );

      expect(result.values["pages-dir"]).toBe("./content");
      expect(result.values["out-dir"]).toBe("./public");
    });

    it("parses long flags with equals separator", () => {
      const result = parseArgs(
        ["--pages-dir=./content", "--out-dir=./public"],
        testOptions,
      );

      expect(result.values["pages-dir"]).toBe("./content");
      expect(result.values["out-dir"]).toBe("./public");
    });

    it("handles flags without defaults", () => {
      const result = parseArgs(["--base-path", "/docs"], testOptions);

      expect(result.values["base-path"]).toBe("/docs");
      expect(result.values["pages-dir"]).toBe("./pages");
    });

    it("throws on unknown long flag", () => {
      expect(() => parseArgs(["--unknown"], testOptions)).toThrow(
        "Unknown option: --unknown",
      );
    });

    it("throws on missing value for long flag", () => {
      expect(() => parseArgs(["--base-path"], testOptions)).toThrow(
        "Missing value for option: --base-path",
      );
    });

    it("throws on empty value for long flag with equals", () => {
      expect(() => parseArgs(["--base-path="], testOptions)).toThrow(
        "Empty value for option: --base-path",
      );
    });

    it("throws on empty value for long flag with space", () => {
      expect(() => parseArgs(["--base-path", ""], testOptions)).toThrow(
        "Empty value for option: --base-path",
      );
    });

    it("allows value that starts with dash when using equals", () => {
      const result = parseArgs(["--base-path=-prefix"], testOptions);

      expect(result.values["base-path"]).toBe("-prefix");
    });
  });

  describe("short flags", () => {
    it("parses short flags", () => {
      const result = parseArgs(
        ["-p", "./content", "-o", "./public"],
        testOptions,
      );

      expect(result.values["pages-dir"]).toBe("./content");
      expect(result.values["out-dir"]).toBe("./public");
    });

    it("throws on unknown short flag", () => {
      expect(() => parseArgs(["-x", "value"], testOptions)).toThrow(
        "Unknown option: -x",
      );
    });

    it("throws on missing value for short flag", () => {
      expect(() => parseArgs(["-p"], testOptions)).toThrow(
        "Missing value for option: -p",
      );
    });

    it("throws on empty value for short flag", () => {
      expect(() => parseArgs(["-p", ""], testOptions)).toThrow(
        "Empty value for option: -p",
      );
    });

    it("throws on bundled short flags", () => {
      expect(() => parseArgs(["-po", "value"], testOptions)).toThrow(
        "Bundled short flags not supported: -po",
      );
    });

    it("throws on bundled short flags with multiple characters", () => {
      expect(() => parseArgs(["-abc"], testOptions)).toThrow(
        "Bundled short flags not supported: -abc",
      );
    });
  });

  describe("help flag", () => {
    it("recognizes --help flag", () => {
      const result = parseArgs(["--help"], testOptions);

      expect(result.help).toBe(true);
    });

    it("recognizes -h flag", () => {
      const result = parseArgs(["-h"], testOptions);

      expect(result.help).toBe(true);
    });

    it("sets help flag alongside other options", () => {
      const result = parseArgs(
        ["--pages-dir", "./content", "--help"],
        testOptions,
      );

      expect(result.help).toBe(true);
      expect(result.values["pages-dir"]).toBe("./content");
    });
  });

  describe("positional arguments", () => {
    it("handles positional arguments after --", () => {
      const result = parseArgs(
        ["--pages-dir", "./content", "--", "extra", "args"],
        testOptions,
      );

      expect(result.values["pages-dir"]).toBe("./content");
      expect(result.positional).toEqual(["extra", "args"]);
    });

    it("allows empty positional args after --", () => {
      const result = parseArgs(["--"], testOptions);

      expect(result.positional).toEqual([]);
    });

    it("throws on positional argument without -- separator", () => {
      expect(() => parseArgs(["unexpected"], testOptions)).toThrow(
        "Unexpected argument: unexpected. Use -- to pass positional arguments.",
      );
    });

    it("throws on typo in option name", () => {
      expect(() => parseArgs(["--pages-dir", "./pages", "build"], testOptions))
        .toThrow("Unexpected argument: build");
    });
  });

  describe("duplicate options", () => {
    it("uses last value when option is provided multiple times", () => {
      const result = parseArgs(
        ["--pages-dir", "first", "--pages-dir", "second"],
        testOptions,
      );

      expect(result.values["pages-dir"]).toBe("second");
    });
  });
});

describe("validateRequiredArgs", () => {
  it("passes when required option is present", () => {
    const result = parseArgs(["--required-opt", "value"], requiredOptions);

    expect(() => validateRequiredArgs(result, requiredOptions)).not.toThrow();
  });

  it("throws when required option is missing", () => {
    const result = parseArgs([], requiredOptions);

    expect(() => validateRequiredArgs(result, requiredOptions)).toThrow(
      "Missing required option: --required-opt",
    );
  });

  it("passes when required option has a value from args", () => {
    const optionsWithDefault: CliOption[] = [
      { long: "opt", description: "An option", required: true },
    ];
    const result = parseArgs(["--opt", "value"], optionsWithDefault);

    expect(() => validateRequiredArgs(result, optionsWithDefault)).not
      .toThrow();
  });
});

import type { CliOption, ParsedArgs } from "./types.ts";

/**
 * Parse command-line arguments based on option definitions.
 *
 * - Long flags: `--name value` or `--name=value`
 * - Short flags: `-n value`
 * - Help: `-h` or `--help`
 * - Positional args: Must come after `--` separator
 *
 * @throws If unknown options or missing values are provided
 */
export function parseArgs(
  args: string[],
  options: CliOption[],
): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    values: {},
    positional: [],
  };

  // Set defaults
  for (const option of options) {
    if (option.default !== undefined) {
      result.values[option.long] = option.default;
    }
  }

  // Build lookup maps
  const shortToLong = new Map<string, string>();
  const validLongs = new Set<string>();

  for (const option of options) {
    validLongs.add(option.long);
    if (option.short) {
      shortToLong.set(option.short, option.long);
    }
  }

  // Always handle help
  validLongs.add("help");
  shortToLong.set("h", "help");

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    // Handle -- separator for positional arguments
    if (arg === "--") {
      result.positional = args.slice(i + 1);
      break;
    }

    // Handle long flags (--name or --name=value)
    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      let name: string;
      let value: string | undefined;

      if (eqIndex !== -1) {
        name = arg.slice(2, eqIndex);
        value = arg.slice(eqIndex + 1);
      } else {
        name = arg.slice(2);
      }

      if (name === "help") {
        result.help = true;
        i++;
        continue;
      }

      if (!validLongs.has(name)) {
        throw new Error(`Unknown option: --${name}`);
      }

      if (value === undefined) {
        // Check if next arg is the value
        if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          value = args[i + 1];
          i++;
        } else {
          throw new Error(`Missing value for option: --${name}`);
        }
      }

      // Reject empty values
      if (value === "") {
        throw new Error(`Empty value for option: --${name}`);
      }

      result.values[name] = value;
      i++;
      continue;
    }

    // Reject bundled short flags (e.g., -abc)
    if (arg.startsWith("-") && arg.length > 2 && !arg.startsWith("--")) {
      throw new Error(
        `Bundled short flags not supported: ${arg}. Use separate flags instead.`,
      );
    }

    // Handle short flags (-n or -n value)
    if (arg.startsWith("-") && arg.length === 2) {
      const short = arg[1];

      if (short === "h") {
        result.help = true;
        i++;
        continue;
      }

      const long = shortToLong.get(short);
      if (!long) {
        throw new Error(`Unknown option: -${short}`);
      }

      // Check if next arg is the value
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        const value = args[i + 1];

        // Reject empty values
        if (value === "") {
          throw new Error(`Empty value for option: -${short}`);
        }

        result.values[long] = value;
        i += 2;
        continue;
      }

      throw new Error(`Missing value for option: -${short}`);
    }

    // Unexpected positional argument without -- separator
    throw new Error(
      `Unexpected argument: ${arg}. Use -- to pass positional arguments.`,
    );
  }

  return result;
}

/**
 * Validate that all required options are present.
 */
export function validateRequiredArgs(
  parsed: ParsedArgs,
  options: CliOption[],
): void {
  for (const option of options) {
    if (option.required && !(option.long in parsed.values)) {
      throw new Error(`Missing required option: --${option.long}`);
    }
  }
}

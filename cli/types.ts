/**
 * CLI option definition for a command.
 */
export interface CliOption {
  /** Short flag (single character, e.g., "p" for -p). */
  short?: string;
  /** Long flag (e.g., "pages-dir" for --pages-dir). */
  long: string;
  /** Description for help text. */
  description: string;
  /** Default value. */
  default?: string;
  /** Whether this option is required. */
  required?: boolean;
}

/**
 * CLI command definition.
 */
export interface CliCommand {
  /** Command name (e.g., "build", "serve", "dev"). */
  name: string;
  /** Short description for help text. */
  description: string;
  /** Usage example (without "deno run" prefix). */
  usage: string;
  /** Available options. */
  options: CliOption[];
  /** Permission requirements for this command. */
  permissions: string;
  /** Example commands. */
  examples: string[];
}

/**
 * Parsed CLI arguments.
 */
export interface ParsedArgs {
  /** Help flag was passed. */
  help: boolean;
  /** Parsed option values. */
  values: Record<string, string>;
  /** Positional arguments (after --). */
  positional: string[];
}

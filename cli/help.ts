import type { CliCommand, CliOption } from "./types.ts";

/**
 * Format a single option line for help text.
 */
function formatOption(option: CliOption): string {
  const shortPart = option.short ? `-${option.short}, ` : "    ";
  const longPart = `--${option.long}`;
  const defaultPart = option.default ? ` (default: ${option.default})` : "";
  const requiredPart = option.required ? " [required]" : "";

  return `  ${shortPart}${longPart}${requiredPart}\n        ${option.description}${defaultPart}`;
}

/**
 * Generate help text for a CLI command.
 */
export function generateHelpText(command: CliCommand): string {
  const lines: string[] = [];

  lines.push(
    `Tabi Pages - ${command.name.charAt(0).toUpperCase()}${
      command.name.slice(1)
    } Command`,
  );
  lines.push("");
  lines.push(command.description);
  lines.push("");

  lines.push("USAGE:");
  lines.push(`  ${command.usage}`);
  lines.push("");

  lines.push("OPTIONS:");
  for (const option of command.options) {
    lines.push(formatOption(option));
  }
  lines.push(formatOption({
    short: "h",
    long: "help",
    description: "Show this help message",
  }));
  lines.push("");

  lines.push("PERMISSIONS:");
  lines.push(`  ${command.permissions}`);
  lines.push("");

  if (command.examples.length > 0) {
    lines.push("EXAMPLES:");
    for (const example of command.examples) {
      lines.push(`  ${example}`);
    }
  }

  return lines.join("\n");
}

/**
 * Print help text to stdout.
 */
export function printHelp(command: CliCommand): void {
  console.log(generateHelpText(command));
}

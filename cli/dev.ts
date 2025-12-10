#!/usr/bin/env -S deno run --allow-all

import { parseArgs } from "./args.ts";
import { handleError } from "./error.ts";
import { printHelp } from "./help.ts";
import type { CliCommand, CliOption } from "./types.ts";

const devOptions: CliOption[] = [
  {
    short: "p",
    long: "pages-dir",
    description: "Directory containing page files",
    default: "./pages",
  },
  {
    long: "port",
    description: "Port to listen on",
    default: "3000",
  },
];

const devCommand: CliCommand = {
  name: "dev",
  description: "Start the development server with hot reload (coming soon).",
  usage: "deno run --allow-all jsr:@tabirun/pages/dev [OPTIONS]",
  options: devOptions,
  permissions: "--allow-all",
  examples: [
    "deno run --allow-all jsr:@tabirun/pages/dev",
    "deno run --allow-all jsr:@tabirun/pages/dev --port 8080",
    "deno run --allow-all jsr:@tabirun/pages/dev --pages-dir ./content",
  ],
};

function main(): void {
  const args = parseArgs(Deno.args, devOptions);

  if (args.help) {
    printHelp(devCommand);
    return;
  }

  // Dev server is not yet implemented
  throw new Error(
    "The dev server is not yet implemented.\n" +
      "Use the build and serve commands instead:\n" +
      "  deno run jsr:@tabirun/pages/build\n" +
      "  deno run jsr:@tabirun/pages/serve\n" +
      "Or check back for updates.",
  );
}

// deno-coverage-ignore-start: Entry point guard cannot be tested when module is imported
if (import.meta.main) {
  try {
    main();
  } catch (error) {
    handleError(error);
  }
}
// deno-coverage-ignore-end

export { devCommand, devOptions, main };

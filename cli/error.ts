// deno-coverage-ignore-start: Functions call Deno.exit() which terminates the process.
// These are tested via subprocess execution in error.test.ts to avoid terminating the test runner.

/**
 * Print an error message to stderr and exit with code 1.
 */
export function exitWithError(message: string): never {
  console.error(`Error: ${message}`);
  Deno.exit(1);
}

/**
 * Handle errors from CLI commands.
 * Prints the error message and exits with code 1.
 */
export function handleError(error: unknown): never {
  if (error instanceof Error) {
    exitWithError(error.message);
  }
  exitWithError(String(error));
}
// deno-coverage-ignore-end

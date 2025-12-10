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

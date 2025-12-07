/**
 * Options for the static server.
 */
export interface StaticServerOptions {
  /**
   * Root directory containing the built static site.
   * Defaults to "./" (current directory).
   */
  rootDir?: string;
  /**
   * Base path prefix that requests must start with.
   * When set, requests without this prefix will return 404.
   * @example "/docs"
   */
  basePath?: string;
}

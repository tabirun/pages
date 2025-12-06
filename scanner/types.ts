/**
 * A discovered page file.
 */
export interface PageEntry {
  /** Absolute path to the page file. */
  filePath: string;
  /** URL route (e.g., "/blog/hello-world"). */
  route: string;
  /** Page type based on extension. */
  type: "markdown" | "tsx";
  /** Layout file paths in order from root to leaf. */
  layoutChain: string[];
}

/**
 * A discovered layout file.
 */
export interface LayoutEntry {
  /** Absolute path to the layout file. */
  filePath: string;
  /** Directory this layout applies to. */
  directory: string;
}

/**
 * System files with optional defaults.
 */
export interface SystemFiles {
  /** Custom document wrapper. Null if using default. */
  html: string | null;
  /** Custom 404 page. Null if using default. */
  notFound: string | null;
  /** Custom error page. Null if using default. */
  error: string | null;
  /** UnoCSS config. Null if UnoCSS not enabled. */
  unoConfig: string | null;
}

/**
 * A public asset file.
 */
export interface PublicAsset {
  /** Absolute path to the asset file. */
  filePath: string;
  /** URL path (e.g., "/favicon.ico"). */
  urlPath: string;
}

/**
 * Result of scanning a pages directory.
 */
export interface PageManifest {
  /** All discovered pages. */
  pages: PageEntry[];
  /** All discovered layouts. */
  layouts: LayoutEntry[];
  /** System files (with nulls for defaults). */
  systemFiles: SystemFiles;
  /** Public assets. */
  publicAssets: PublicAsset[];
}

/**
 * Type of file change event.
 */
export type FileChangeType = "create" | "update" | "delete";

/**
 * Category of changed file for targeted refresh.
 */
export type FileCategory =
  | "page"
  | "layout"
  | "system"
  | "unoConfig"
  | "publicAsset"
  | "code";

/**
 * File change event for watch mode.
 */
export interface FileChangeEvent {
  /** Type of change. */
  type: FileChangeType;
  /** Category of the changed file. */
  category: FileCategory;
  /** Absolute path to the changed file. */
  filePath: string;
  /** URL route if applicable (for pages). */
  route?: string;
}

/**
 * Handle returned by watchPages for cleanup.
 */
export interface WatchHandle {
  /** Stop watching and clean up resources. */
  stop(): void;
}

/**
 * Options for scanning pages.
 */
export interface ScanOptions {
  /** Project root directory. */
  rootDir: string;
  /** Directory containing page files (relative to rootDir). Defaults to "pages". */
  pagesDir?: string;
  /** Directory containing public assets (relative to rootDir). Defaults to "public". */
  publicDir?: string;
}

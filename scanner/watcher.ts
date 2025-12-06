import { basename, join, relative, resolve } from "@std/path";
import { debounce } from "@std/async";
import { classifyFile } from "./classifier.ts";
import { filePathToRoute, publicPathToRoute } from "./routes.ts";
import type {
  FileCategory,
  FileChangeEvent,
  FileChangeType,
  ScanOptions,
  WatchHandle,
} from "./types.ts";

const DEFAULT_PAGES_DIR = "pages";
const DEFAULT_PUBLIC_DIR = "public";
const DEFAULT_DEBOUNCE_MS = 100;

/** Directories to skip when processing file events. */
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage"]);

/**
 * Checks if a directory name is hidden (starts with dot).
 */
function isHiddenDir(name: string): boolean {
  return name.startsWith(".") && name !== ".";
}

/**
 * Checks if a file path should be ignored based on directory rules.
 */
function shouldIgnorePath(filePath: string, rootDir: string): boolean {
  const relativePath = relative(rootDir, filePath);
  const segments = relativePath.split(/[/\\]/);

  for (const segment of segments) {
    if (SKIP_DIRS.has(segment) || isHiddenDir(segment)) {
      return true;
    }
  }
  return false;
}

/**
 * Options for watch mode.
 */
export interface WatchOptions extends ScanOptions {
  /** Debounce delay in milliseconds. Defaults to 100ms. */
  debounceMs?: number;
}

/**
 * Categorizes a file based on its path and location.
 *
 * @param filePath - Absolute path to the file
 * @param pagesDir - Absolute path to pages directory
 * @param publicDir - Absolute path to public directory
 * @param rootDir - Absolute path to project root
 * @returns File category for watch events, or null for unknown files
 */
function categorizeFile(
  filePath: string,
  pagesDir: string,
  publicDir: string,
  rootDir: string,
): FileCategory | null {
  // Check if it's uno.config.ts at root
  if (filePath === join(rootDir, "uno.config.ts")) {
    return "unoConfig";
  }

  // Check if it's in public directory
  if (filePath.startsWith(publicDir + "/") || filePath === publicDir) {
    return "publicAsset";
  }

  // Check if it's in pages directory
  if (filePath.startsWith(pagesDir + "/") || filePath === pagesDir) {
    const relativePath = relative(pagesDir, filePath);
    const classification = classifyFile(relativePath);

    switch (classification.type) {
      case "page":
        return "page";
      case "layout":
        return "layout";
      case "system":
        return "system";
      case "other": {
        // Only TypeScript files in pages dir are "code"
        const fileName = basename(filePath);
        if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) {
          return "code";
        }
        // Ignore non-TypeScript files in pages dir
        return null;
      }
      // deno-coverage-ignore-start -- exhaustive check unreachable by design
      default: {
        const _exhaustive: never = classification;
        throw new Error(
          `Unhandled classification type: ${JSON.stringify(_exhaustive)}`,
        );
      }
        // deno-coverage-ignore-stop
    }
  }

  // Files outside pages/public - only TypeScript files are relevant
  const fileName = basename(filePath);
  if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) {
    return "code";
  }

  // Ignore unknown files
  return null;
}

/**
 * Maps Deno.FsEvent kind to FileChangeType.
 */
function mapEventKind(kind: Deno.FsEvent["kind"]): FileChangeType | null {
  switch (kind) {
    case "create":
      return "create";
    case "modify":
      return "update";
    case "remove":
      return "delete";
    case "rename":
      // Rename events are tricky - treat as update
      return "update";
    // deno-coverage-ignore-start -- platform-specific events rarely triggered in tests
    case "access":
    case "other":
    default:
      // "access" and "other" events don't represent file changes.
      // Default case returns null for forward compatibility with future Deno.FsEvent kinds.
      return null;
      // deno-coverage-ignore-stop
  }
}

/**
 * Watches for file changes and emits events.
 *
 * Watches the entire project root recursively for changes. Events are
 * debounced to handle rapid changes (e.g., editor save + format).
 * Ignores node_modules, dist, and hidden directories.
 *
 * @param options - Watch configuration
 * @param onChange - Callback for file change events
 * @returns Handle to stop watching
 *
 * @example
 * const handle = watchPages(
 *   { rootDir: "/project" },
 *   (event) => console.log(event)
 * );
 * // Later...
 * handle.stop();
 */
export function watchPages(
  options: WatchOptions,
  onChange: (event: FileChangeEvent) => void,
): WatchHandle {
  // Resolve to real paths to handle symlinks (e.g., macOS /var -> /private/var)
  const rootDir = Deno.realPathSync(resolve(options.rootDir));
  const pagesDir = join(rootDir, options.pagesDir ?? DEFAULT_PAGES_DIR);
  const publicDir = join(rootDir, options.publicDir ?? DEFAULT_PUBLIC_DIR);
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  // Track pending events for debouncing per file
  const pendingEvents = new Map<string, FileChangeEvent>();

  // Debounced flush function
  const flush = debounce(() => {
    for (const event of pendingEvents.values()) {
      onChange(event);
    }
    pendingEvents.clear();
  }, debounceMs);

  // Process a single file change
  const processChange = (filePath: string, kind: Deno.FsEvent["kind"]) => {
    // Skip ignored directories (node_modules, dist, hidden dirs)
    if (shouldIgnorePath(filePath, rootDir)) return;

    const changeType = mapEventKind(kind);
    // deno-coverage-ignore -- only triggered by access/other events
    if (!changeType) return;

    const category = categorizeFile(filePath, pagesDir, publicDir, rootDir);
    // Skip unknown files (non-TypeScript files outside pages/public)
    if (!category) return;

    const event: FileChangeEvent = {
      type: changeType,
      category,
      filePath,
    };

    // Add route for pages
    if (category === "page" && filePath.startsWith(pagesDir + "/")) {
      const relativePath = relative(pagesDir, filePath);
      event.route = filePathToRoute(relativePath);
    }

    // Add route for public assets
    if (category === "publicAsset" && filePath.startsWith(publicDir + "/")) {
      const relativePath = relative(publicDir, filePath);
      event.route = publicPathToRoute(relativePath);
    }

    // Queue event (overwrites previous pending event for same file)
    pendingEvents.set(filePath, event);
    flush();
  };

  // Start watchers
  const watchers: Deno.FsWatcher[] = [];
  let stopped = false;

  const startWatcher = (path: string): Deno.FsWatcher | null => {
    try {
      // Deno.watchFs throws if path doesn't exist - verify first
      Deno.statSync(path);
      const watcher = Deno.watchFs(path, { recursive: true });
      watchers.push(watcher);

      // Process events in background
      (async () => {
        try {
          for await (const event of watcher) {
            // deno-coverage-ignore -- async timing makes this hard to test
            if (stopped) break;
            for (const eventPath of event.paths) {
              processChange(eventPath, event.kind);
            }
          }
          // deno-coverage-ignore-start -- error handling requires mocking Deno internals
        } catch (error) {
          // Only ignore expected errors from watcher closure
          if (!stopped && !(error instanceof Deno.errors.BadResource)) {
            throw error;
          }
        }
        // deno-coverage-ignore-stop
      })();

      return watcher;
      // deno-coverage-ignore-start -- error handling requires mocking Deno internals
    } catch (error) {
      // Directory doesn't exist - skip silently
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
      return null;
    }
    // deno-coverage-ignore-stop
  };

  // Watch entire project root - categorization handles file types,
  // shouldIgnorePath filters out node_modules/dist/hidden dirs
  startWatcher(rootDir);

  return {
    stop() {
      stopped = true;
      flush.clear();
      pendingEvents.clear();
      for (const watcher of watchers) {
        try {
          watcher.close();
          // deno-coverage-ignore-start -- error on close requires mocking
        } catch {
          // Ignore errors on close
        }
        // deno-coverage-ignore-stop
      }
      watchers.length = 0;
    },
  };
}

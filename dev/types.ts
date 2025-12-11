/**
 * Types for the dev server module.
 *
 * @module
 */

import type { PageManifest, WatchHandle } from "../scanner/types.ts";

/**
 * Options for registering the dev server.
 */
export interface DevServerOptions {
  /** Project root directory (absolute path). */
  rootDir: string;
  /** Directory containing page files (relative to rootDir). Defaults to "pages". */
  pagesDir?: string;
  /** Directory containing public assets (relative to rootDir). Defaults to "public". */
  publicDir?: string;
  /** Base path prefix for the site (e.g., "/docs"). */
  basePath?: string;
}

/**
 * Internal state for the dev server.
 */
export interface DevServerState {
  /** Current page manifest, null if needs to be rebuilt. */
  manifest: PageManifest | null;
  /** Hot reload server instance. */
  hotReload: HotReloadServer;
  /** Watch handle for file changes. */
  watchHandle: WatchHandle | null;
  /** Project root directory. */
  rootDir: string;
  /** Pages directory (relative to rootDir). */
  pagesDir: string;
  /** Public directory (relative to rootDir). */
  publicDir: string;
  /** Base path prefix. */
  basePath: string;
  /** Absolute path to framework's preact directory. */
  preactDir: string;
}

/**
 * Hot reload message types sent to connected clients.
 */
export type HotReloadMessage =
  | HotReloadReloadMessage
  | HotReloadErrorMessage;

/**
 * Message to trigger a page reload.
 */
export interface HotReloadReloadMessage {
  type: "reload";
}

/**
 * Message to display an error in the browser.
 */
export interface HotReloadErrorMessage {
  type: "error";
  /** Error message. */
  message: string;
  /** Error stack trace (optional). */
  stack?: string;
}

/**
 * Hot reload server interface.
 */
export interface HotReloadServer {
  /**
   * Handles a new WebSocket connection.
   * Call this with the WebSocket from TabiContext.websocket().
   */
  handleConnection(socket: WebSocket): void;

  /**
   * Broadcasts a reload message to all connected clients.
   */
  reload(): void;

  /**
   * Broadcasts an error message to all connected clients.
   */
  sendError(message: string, stack?: string): void;

  /**
   * Closes all connections and cleans up resources.
   */
  close(): void;

  /**
   * Returns the number of connected clients.
   */
  readonly clientCount: number;
}

/**
 * Cleanup function returned by registerDevServer.
 */
export type DevServerCleanup = () => void;

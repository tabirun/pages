/**
 * Hot reload server for development mode.
 *
 * Manages WebSocket connections to browser clients and broadcasts
 * reload/error messages when files change.
 *
 * @module
 */

import type { HotReloadMessage, HotReloadServer } from "./types.ts";

/**
 * Maximum number of connected clients allowed.
 * Prevents memory exhaustion in dev mode.
 */
const MAX_CLIENTS = 100;

/**
 * Maximum error message length to prevent memory issues.
 */
const MAX_MESSAGE_LENGTH = 50_000;

/**
 * Creates a hot reload server that manages WebSocket connections.
 *
 * The server:
 * - Accepts WebSocket connections from TabiApp via c.websocket()
 * - Tracks connected clients
 * - Broadcasts reload/error messages to all clients
 * - Handles client disconnection gracefully
 *
 * @returns Hot reload server instance
 *
 * @example
 * ```ts
 * import { TabiApp } from "@tabirun/app";
 *
 * const app = new TabiApp();
 * const hotReload = createHotReloadServer();
 *
 * // Register WebSocket route on TabiApp
 * app.get("/__hot-reload", (c) => {
 *   c.webSocket((socket) => {
 *     hotReload.handleConnection(socket);
 *   });
 * });
 *
 * // On file change
 * hotReload.reload();
 *
 * // On error
 * hotReload.sendError("Compilation failed", error.stack);
 *
 * // Cleanup on shutdown
 * hotReload.close();
 * ```
 */
export function createHotReloadServer(): HotReloadServer {
  const clients = new Set<WebSocket>();

  function broadcast(message: HotReloadMessage): void {
    const data = JSON.stringify(message);
    for (const socket of clients) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(data);
        } catch {
          // Socket is in a bad state, remove it
          clients.delete(socket);
        }
      }
    }
  }

  return {
    handleConnection(socket: WebSocket): void {
      // Enforce connection limit to prevent resource exhaustion
      if (clients.size >= MAX_CLIENTS) {
        socket.close(1008, "Maximum connections exceeded");
        return;
      }

      clients.add(socket);

      socket.onclose = () => {
        clients.delete(socket);
      };

      socket.onerror = () => {
        clients.delete(socket);
      };
    },

    reload(): void {
      broadcast({ type: "reload" });
    },

    sendError(message: string, stack?: string): void {
      // Truncate to prevent memory issues with very large error messages
      const truncatedMessage = message.length > MAX_MESSAGE_LENGTH
        ? message.slice(0, MAX_MESSAGE_LENGTH) + "... (truncated)"
        : message;
      const truncatedStack = stack && stack.length > MAX_MESSAGE_LENGTH
        ? stack.slice(0, MAX_MESSAGE_LENGTH) + "... (truncated)"
        : stack;
      broadcast({
        type: "error",
        message: truncatedMessage,
        stack: truncatedStack,
      });
    },

    close(): void {
      for (const socket of clients) {
        try {
          socket.close(1000, "Server shutting down");
        } catch {
          // Socket may already be closed
        }
      }
      clients.clear();
    },

    get clientCount(): number {
      return clients.size;
    },
  };
}

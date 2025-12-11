/**
 * Hot reload client script generator for development mode.
 *
 * Generates JavaScript code to be injected into pages that establishes
 * a WebSocket connection for hot reload functionality.
 *
 * @module
 */

/**
 * Options for generating the hot reload client script.
 */
export interface HotReloadScriptOptions {
  /** Base path prefix for the site (e.g., "/docs"). Defaults to "". */
  basePath?: string;
}

/**
 * Regex for valid basePath segments (defense-in-depth, also validated by PagesConfigSchema).
 * Allows empty string or path starting with / containing lowercase alphanumeric, hyphens, and underscores.
 */
const BASE_PATH_REGEX = /^(\/[a-z0-9_-]+)*$/;

/**
 * Generates the hot reload client script to be injected into pages.
 *
 * The generated script:
 * - Connects to the WebSocket endpoint at `{basePath}/__hot-reload`
 * - Handles "reload" messages by reloading the page
 * - Handles "error" messages (for error overlay integration)
 * - Automatically reconnects on disconnect with exponential backoff
 * - Uses the page's protocol (ws:// or wss://) based on location
 *
 * @param options - Configuration options
 * @returns JavaScript code as a string (no script tags)
 * @throws Error if basePath contains invalid characters
 *
 * @example
 * ```ts
 * const script = generateHotReloadScript({ basePath: "/docs" });
 * // Inject into page: <script>${script}</script>
 * ```
 */
export function generateHotReloadScript(
  options: HotReloadScriptOptions = {},
): string {
  const basePath = options.basePath ?? "";

  // Defense-in-depth: validate basePath to prevent code injection
  // (also validated upstream by PagesConfigSchema)
  if (!BASE_PATH_REGEX.test(basePath)) {
    throw new Error(
      "Invalid basePath: must be empty or start with / and contain only lowercase alphanumeric, hyphens, and underscores",
    );
  }

  const wsPath = `${basePath}/__hot-reload`;

  // Generate self-contained client script
  // Uses IIFE to avoid polluting global scope
  return `(function() {
  var wsPath = ${JSON.stringify(wsPath)};
  var reconnectDelay = 1000;
  var maxReconnectDelay = 30000;
  var socket = null;

  function connect() {
    var protocol = location.protocol === "https:" ? "wss:" : "ws:";
    var url = protocol + "//" + location.host + wsPath;

    try {
      socket = new WebSocket(url);
    } catch (e) {
      console.error("[hot-reload] Failed to create WebSocket:", e);
      scheduleReconnect();
      return;
    }

    socket.onopen = function() {
      console.log("[hot-reload] Connected");
      reconnectDelay = 1000;
    };

    socket.onmessage = function(event) {
      try {
        var message = JSON.parse(event.data);
        if (message.type === "reload") {
          console.log("[hot-reload] Reloading...");
          location.reload();
        } else if (message.type === "error") {
          console.error("[hot-reload] Server error:", message.message);
          if (message.stack) {
            console.error(message.stack);
          }
        }
      } catch (e) {
        console.error("[hot-reload] Failed to parse message:", e);
      }
    };

    socket.onclose = function() {
      console.log("[hot-reload] Disconnected");
      socket = null;
      scheduleReconnect();
    };

    socket.onerror = function() {
      socket = null;
    };
  }

  function scheduleReconnect() {
    console.log("[hot-reload] Reconnecting in " + reconnectDelay + "ms...");
    setTimeout(function() {
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      connect();
    }, reconnectDelay);
  }

  connect();
})();`;
}

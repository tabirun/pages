/**
 * Error overlay HTML generator for development mode.
 *
 * Generates a full HTML page displaying an error with inline styles,
 * including the hot reload script for automatic recovery when the
 * error is fixed.
 *
 * @module
 */

import { generateHotReloadScript } from "./client-script.ts";

/**
 * Options for rendering the error overlay.
 */
export interface ErrorOverlayOptions {
  /** Error message to display. */
  message: string;
  /** Optional stack trace. */
  stack?: string;
  /** Base path prefix for the site (e.g., "/docs"). */
  basePath?: string;
}

/**
 * Escapes HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders an error overlay HTML page.
 *
 * The overlay displays the error message and optional stack trace with
 * inline styles (no external CSS dependencies). It includes the hot reload
 * script so the page will automatically reload when the error is fixed.
 *
 * @param options - Error overlay options
 * @returns Complete HTML document string
 *
 * @example
 * ```typescript
 * const html = renderErrorOverlay({
 *   message: "Failed to compile page",
 *   stack: "Error: ...\n    at bundleSSR (...)",
 *   basePath: "/docs",
 * });
 * // Returns full HTML page with error display and hot reload script
 * ```
 */
export function renderErrorOverlay(options: ErrorOverlayOptions): string {
  const { message, stack, basePath = "" } = options;

  const hotReloadScript = generateHotReloadScript({ basePath });

  const escapedMessage = escapeHtml(message);
  const escapedStack = stack ? escapeHtml(stack) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Development Server</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #1a1a1a;
      color: #f5f5f5;
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .error-icon {
      width: 48px;
      height: 48px;
      background-color: #dc2626;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: white;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #ef4444;
    }

    .message {
      background-color: #2d2d2d;
      border-left: 4px solid #dc2626;
      padding: 1.5rem;
      border-radius: 0 8px 8px 0;
      margin-bottom: 1.5rem;
    }

    .message-text {
      font-size: 1.125rem;
      line-height: 1.6;
      word-break: break-word;
    }

    .stack {
      background-color: #0d0d0d;
      border-radius: 8px;
      padding: 1.5rem;
      overflow-x: auto;
    }

    .stack-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stack-trace {
      font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace;
      font-size: 0.875rem;
      line-height: 1.8;
      color: #d4d4d4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #333;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .footer-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pulse {
      width: 8px;
      height: 8px;
      background-color: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="error-icon">!</div>
      <h1>Build Error</h1>
    </div>

    <div class="message">
      <p class="message-text">${escapedMessage}</p>
    </div>

    ${
    escapedStack
      ? `<div class="stack">
      <div class="stack-title">Stack Trace</div>
      <pre class="stack-trace">${escapedStack}</pre>
    </div>`
      : ""
  }

    <div class="footer">
      <div class="footer-text">
        <div class="pulse"></div>
        <span>Waiting for changes... The page will reload automatically when the error is fixed.</span>
      </div>
    </div>
  </div>

  <script>${hotReloadScript}</script>
</body>
</html>`;
}

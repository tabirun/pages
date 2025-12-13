# dev

Development server with hot reload using subprocess builds.

## API

| Function            | Description                             |
| ------------------- | --------------------------------------- |
| `registerDevServer` | Register dev server routes on a TabiApp |

## Usage

```ts
import { TabiApp } from "@tabirun/app";
import { registerDevServer } from "@tabirun/pages/dev";

const app = new TabiApp();

const handle = await registerDevServer(app, {
  pagesDir: "/path/to/pages",
  basePath: "", // optional
});

Deno.serve({ port: 3000 }, app.handler);

// Later, to stop the dev server:
await handle.stop();
```

## Architecture

```
Browser Request → Dev Server → Subprocess Build → Fresh Deno Process
                      ↓
              File Watcher → WebSocket → Browser Reload
```

Each page request spawns a fresh Deno subprocess to build the page. This escapes
Deno's module caching, ensuring code changes are always reflected without
restarting the server.

## Registered Routes

| Route         | Description                    |
| ------------- | ------------------------------ |
| `/__dev`      | WebSocket endpoint for HMR     |
| `/__tabi/*`   | Client-side JavaScript bundles |
| `/__styles/*` | UnoCSS stylesheets             |
| `/*`          | Public assets and page serving |

## DevServerOptions

```ts
interface DevServerOptions {
  /** Directory containing page files. Defaults to "./pages". */
  pagesDir?: string;
  /** Base path prefix for the site. */
  basePath?: string;
}
```

## DevServerHandle

```ts
interface DevServerHandle {
  /** Stop the dev server and clean up resources. */
  stop(): Promise<void>;
}
```

Calling `stop()` will:

- Stop the file watcher
- Close all WebSocket connections
- Remove the `.tabi` build directory

## HMR Protocol

The dev server uses a simple WebSocket protocol for hot reload:

```ts
type HMRMessage = { type: "reload" };
```

On any file change, the server broadcasts a reload message to all connected
clients. The injected client script reloads the page on receiving this message.

## Error Handling

Build errors and 404s are rendered as HTML error pages with the HMR script
injected, so they auto-reload when you fix the issue.

## Notes

- Internal module used by `pages().dev()`
- Builds to `.tabi/` directory (same as production)
- Uses existing `bundleClient` and `compileUnoCSS` functions
- Ephemeral logging shows rendered pages in terminal

# test-utils

Test server for running Tabi apps in tests.

## Installation

```typescript
import { TabiTestServer } from "./test-utils";
```

e

## Usage

```typescript
Deno.test("GET /health returns 200", async () => {
  const server = new TabiTestServer();

  server.app.get("/health", (c) => c.json({ status: "ok" }));
  server.start();

  const res = await fetch(server.url("/health"));
  assertEquals(res.status, 200);

  await server.stop();
});
```

## API

- `new TabiTestServer()` - Create test server instance
- `app` - The underlying `TabiApp` instance
- `start(port?)` - Start server (uses random port if not specified)
- `url(path)` - Get HTTP URL for path
- `wsUrl(path)` - Get WebSocket URL for path
- `stop()` - Gracefully shutdown server

## Notes

- Uses port 0 by default to avoid "address in use" errors
- Always call `stop()` after tests to release resources

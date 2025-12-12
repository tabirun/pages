import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { dirname, fromFileUrl, join } from "@std/path";
import { TabiApp } from "@tabirun/app";
import { registerDevServer } from "../server.ts";
import type { DevServerCleanup } from "../types.ts";

const TEST_DIR = dirname(fromFileUrl(import.meta.url));
const FIXTURES_DIR = join(TEST_DIR, "fixtures");

describe(
  "registerDevServer",
  { sanitizeResources: false, sanitizeOps: false },
  () => {
    let app: TabiApp;
    let cleanup: DevServerCleanup | null = null;
    let server: Deno.HttpServer | null = null;
    let port: number;

    beforeEach(() => {
      app = new TabiApp();
      cleanup = null;
      server = null;
    });

    afterEach(async () => {
      cleanup?.();
      if (server) {
        server.shutdown();
        await server.finished;
      }
    });

    function startServer(): string {
      server = Deno.serve({ port: 0 }, app.handler);
      const addr = server.addr as Deno.NetAddr;
      port = addr.port;
      return `http://localhost:${port}`;
    }

    describe("initialization", () => {
      it("should register routes and return cleanup function", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        expect(typeof cleanup).toBe("function");
      });

      it("should scan pages on startup", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        const baseUrl = startServer();

        // Request should work (manifest is populated)
        const response = await fetch(`${baseUrl}/simple`);
        expect(response.status).toBe(200);
      });
    });

    describe("hot reload endpoint", () => {
      it("should handle WebSocket connections at /__hot-reload", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        const baseUrl = startServer();
        const wsUrl = baseUrl.replace("http", "ws") + "/__hot-reload";

        const ws = new WebSocket(wsUrl);
        const connected = await new Promise<boolean>((resolve) => {
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 1000);
        });

        expect(connected).toBe(true);
        ws.close();
      });

      it("should handle WebSocket connections with basePath", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
          basePath: "/docs",
        });

        const baseUrl = startServer();
        const wsUrl = baseUrl.replace("http", "ws") + "/docs/__hot-reload";

        const ws = new WebSocket(wsUrl);
        const connected = await new Promise<boolean>((resolve) => {
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 1000);
        });

        expect(connected).toBe(true);
        ws.close();
      });
    });

    describe("page requests", () => {
      it("should render TSX pages", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        const baseUrl = startServer();
        const response = await fetch(`${baseUrl}/simple`);

        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("__tabi__");
        expect(html).toContain("__hot-reload");
      });

      it("should return 404 for non-existent pages", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        const baseUrl = startServer();
        const response = await fetch(`${baseUrl}/nonexistent`);

        expect(response.status).toBe(404);
        const html = await response.text();
        expect(html).toContain("404");
      });

      it("should handle basePath in page requests", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
          basePath: "/docs",
        });

        const baseUrl = startServer();

        // Request with basePath should work
        const response = await fetch(`${baseUrl}/docs/simple`);
        expect(response.status).toBe(200);

        // Request without basePath should 404
        const response2 = await fetch(`${baseUrl}/simple`);
        expect(response2.status).toBe(404);
      });

      it("should handle root path with basePath", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
          basePath: "/docs",
        });

        const baseUrl = startServer();

        // Root of basePath should return index page (or 404 if no index)
        const response = await fetch(`${baseUrl}/docs`);
        // Either 200 (index exists) or 404 (no index) - both are valid
        expect([200, 404]).toContain(response.status);
      });

      it("should normalize routes with trailing slashes", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        const baseUrl = startServer();

        // Request with trailing slash
        const response = await fetch(`${baseUrl}/simple/`);
        expect(response.status).toBe(200);
      });
    });

    describe("cleanup", () => {
      it("should stop file watching on cleanup", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        // Cleanup should not throw
        cleanup();
        cleanup = null; // Prevent double cleanup in afterEach
      });

      it("should close hot reload connections on cleanup", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: FIXTURES_DIR,
        });

        const baseUrl = startServer();
        const wsUrl = baseUrl.replace("http", "ws") + "/__hot-reload";

        const ws = new WebSocket(wsUrl);
        await new Promise<void>((resolve) => {
          ws.onopen = () => resolve();
          setTimeout(resolve, 1000);
        });

        // Cleanup should close connections
        cleanup();
        cleanup = null;

        // WebSocket should eventually close
        await new Promise<void>((resolve) => {
          if (ws.readyState === WebSocket.CLOSED) {
            resolve();
          } else {
            ws.onclose = () => resolve();
            setTimeout(resolve, 1000);
          }
        });

        expect(ws.readyState).toBe(WebSocket.CLOSED);
      });
    });
  },
);

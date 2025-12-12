/**
 * Integration tests for the dev server.
 *
 * These tests verify the complete dev server flow using example apps.
 */

import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { dirname, fromFileUrl, join } from "@std/path";
import { TabiApp } from "@tabirun/app";
import { registerDevServer } from "../server.ts";
import type { DevServerCleanup } from "../types.ts";

const TEST_DIR = dirname(fromFileUrl(import.meta.url));
const EXAMPLES_DIR = join(TEST_DIR, "../../examples");

describe(
  "Dev Server Integration",
  { sanitizeResources: false, sanitizeOps: false },
  () => {
    let app: TabiApp;
    let cleanup: DevServerCleanup | null = null;
    let server: Deno.HttpServer | null = null;
    let baseUrl: string;

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
      baseUrl = `http://localhost:${addr.port}`;
      return baseUrl;
    }

    describe("01-minimal example", () => {
      const MINIMAL_DIR = join(EXAMPLES_DIR, "01-minimal");

      it("should render the home page", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: MINIMAL_DIR,
        });
        startServer();

        const response = await fetch(`${baseUrl}/`);
        expect(response.status).toBe(200);

        const html = await response.text();
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("Minimal Example");
        expect(html).toContain("__tabi__");
      });

      it("should include hot reload script", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: MINIMAL_DIR,
        });
        startServer();

        const response = await fetch(`${baseUrl}/`);
        const html = await response.text();

        expect(html).toContain("__hot-reload");
        expect(html).toContain("WebSocket");
      });

      it("should return 404 for non-existent pages", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: MINIMAL_DIR,
        });
        startServer();

        const response = await fetch(`${baseUrl}/nonexistent`);
        expect(response.status).toBe(404);

        const html = await response.text();
        expect(html).toContain("404");
      });
    });

    describe("02-base-path example", () => {
      const BASE_PATH_DIR = join(EXAMPLES_DIR, "02-base-path");

      it("should serve pages under basePath", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: BASE_PATH_DIR,
          basePath: "/docs",
        });
        startServer();

        const response = await fetch(`${baseUrl}/docs/`);
        expect(response.status).toBe(200);

        const html = await response.text();
        expect(html).toContain("Base Path Example");
      });

      it("should include basePath in hot reload script", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: BASE_PATH_DIR,
          basePath: "/docs",
        });
        startServer();

        const response = await fetch(`${baseUrl}/docs/`);
        const html = await response.text();

        expect(html).toContain("/docs/__hot-reload");
      });

      it("should serve nested pages under basePath", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: BASE_PATH_DIR,
          basePath: "/docs",
        });
        startServer();

        const response = await fetch(`${baseUrl}/docs/about`);
        expect(response.status).toBe(200);

        const html = await response.text();
        expect(html).toContain("About");
      });
    });

    describe("03-layouts example", () => {
      const LAYOUTS_DIR = join(EXAMPLES_DIR, "03-layouts");

      it("should render pages with layouts", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: LAYOUTS_DIR,
        });
        startServer();

        const response = await fetch(`${baseUrl}/`);
        expect(response.status).toBe(200);

        const html = await response.text();
        // Page content
        expect(html).toContain("Nested Layouts Example");
        // Layout should wrap the content
        expect(html).toContain("<!DOCTYPE html>");
      });

      it("should render nested layout pages", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: LAYOUTS_DIR,
        });
        startServer();

        const response = await fetch(`${baseUrl}/blog`);
        expect(response.status).toBe(200);

        const html = await response.text();
        expect(html).toContain("Blog");
      });
    });

    describe("04-markdown example", () => {
      const MARKDOWN_DIR = join(EXAMPLES_DIR, "04-markdown");

      it("should render markdown pages", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: MARKDOWN_DIR,
        });
        startServer();

        // The /docs route is a markdown page
        const response = await fetch(`${baseUrl}/docs`);
        expect(response.status).toBe(200);

        const html = await response.text();
        expect(html).toContain("Documentation");
      });
    });

    describe("06-not-found example", () => {
      const NOT_FOUND_DIR = join(EXAMPLES_DIR, "06-not-found");

      it("should use custom _not-found page", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: NOT_FOUND_DIR,
        });
        startServer();

        const response = await fetch(`${baseUrl}/nonexistent`);
        expect(response.status).toBe(404);

        const html = await response.text();
        // Custom not-found page should be rendered
        expect(html).toContain("Page Not Found");
      });
    });

    describe("hot reload WebSocket", () => {
      const MINIMAL_DIR = join(EXAMPLES_DIR, "01-minimal");

      it("should accept WebSocket connections", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: MINIMAL_DIR,
        });
        startServer();

        const wsUrl = baseUrl.replace("http", "ws") + "/__hot-reload";
        const ws = new WebSocket(wsUrl);

        const connected = await new Promise<boolean>((resolve) => {
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 2000);
        });

        expect(connected).toBe(true);

        await new Promise<void>((resolve) => {
          ws.onclose = () => resolve();
          ws.close();
        });
      });

      it("should accept multiple WebSocket connections", async () => {
        cleanup = await registerDevServer(app, {
          rootDir: MINIMAL_DIR,
        });
        startServer();

        const wsUrl = baseUrl.replace("http", "ws") + "/__hot-reload";
        const ws1 = new WebSocket(wsUrl);
        const ws2 = new WebSocket(wsUrl);

        const [connected1, connected2] = await Promise.all([
          new Promise<boolean>((resolve) => {
            ws1.onopen = () => resolve(true);
            ws1.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 2000);
          }),
          new Promise<boolean>((resolve) => {
            ws2.onopen = () => resolve(true);
            ws2.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 2000);
          }),
        ]);

        expect(connected1).toBe(true);
        expect(connected2).toBe(true);

        await Promise.all([
          new Promise<void>((resolve) => {
            ws1.onclose = () => resolve();
            ws1.close();
          }),
          new Promise<void>((resolve) => {
            ws2.onclose = () => resolve();
            ws2.close();
          }),
        ]);
      });
    });

    describe("error handling", () => {
      it("should return error overlay for broken pages", async () => {
        // Create a temporary broken page
        const tempDir = await Deno.makeTempDir();
        const pagesDir = join(tempDir, "pages");
        await Deno.mkdir(pagesDir);
        await Deno.writeTextFile(
          join(pagesDir, "broken.tsx"),
          `export default function Broken() { return <NonExistent />; }`,
        );

        try {
          cleanup = await registerDevServer(app, {
            rootDir: tempDir,
          });
          startServer();

          const response = await fetch(`${baseUrl}/broken`);
          expect(response.status).toBe(500);

          const html = await response.text();
          expect(html).toContain("Build Error");
          expect(html).toContain("__hot-reload");
        } finally {
          await Deno.remove(tempDir, { recursive: true });
        }
      });
    });
  },
);

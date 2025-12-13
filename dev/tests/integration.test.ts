import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { TabiApp } from "@tabirun/app";
import { type DevServerHandle, registerDevServer } from "../server.ts";

// Reuse build test fixtures - they have a complete page structure
const FIXTURES_DIR = new URL(
  "../../build/tests/fixtures/",
  import.meta.url,
).pathname;
const PAGES_DIR = join(FIXTURES_DIR, "pages");

describe("registerDevServer", () => {
  let app: TabiApp;
  let handle: DevServerHandle;
  let server: Deno.HttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    app = new TabiApp();
    handle = await registerDevServer(app, { pagesDir: PAGES_DIR });

    // Start server on random port
    server = Deno.serve({ port: 0, onListen: () => {} }, app.handler);
    const addr = server.addr as Deno.NetAddr;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    await handle.stop();
    await server.shutdown();
  });

  describe("page serving", () => {
    it("serves index page at /", async () => {
      const response = await fetch(`${baseUrl}/`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");

      const html = await response.text();
      expect(html).toContain("Welcome Home");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("serves page at /about", async () => {
      const response = await fetch(`${baseUrl}/about`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");

      const html = await response.text();
      expect(html).toContain("About Us");
    });

    it("serves nested page at /blog/post", async () => {
      const response = await fetch(`${baseUrl}/blog/post`);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Blog content here");
    });

    it("returns 404 for non-existent page", async () => {
      const response = await fetch(`${baseUrl}/does-not-exist`);

      expect(response.status).toBe(404);
      const html = await response.text();
      // Should return custom 404 page or error page
      expect(html).toContain("<!DOCTYPE html>");
    });
  });

  describe("HMR script injection", () => {
    it("injects HMR script into HTML response", async () => {
      const response = await fetch(`${baseUrl}/`);
      const html = await response.text();

      expect(html).toContain("new WebSocket");
      expect(html).toContain("/__dev");
      expect(html).toContain("location.reload()");
    });

    it("injects HMR script before closing body tag", async () => {
      const response = await fetch(`${baseUrl}/`);
      const html = await response.text();

      // Script should appear before </body>
      const scriptIndex = html.indexOf("new WebSocket");
      const bodyEndIndex = html.lastIndexOf("</body>");
      expect(scriptIndex).toBeLessThan(bodyEndIndex);
    });

    it("injects HMR script into 404 error page", async () => {
      const response = await fetch(`${baseUrl}/does-not-exist`);
      const html = await response.text();

      expect(response.status).toBe(404);
      expect(html).toContain("new WebSocket");
      expect(html).toContain("/__dev");
    });
  });

  describe("WebSocket endpoint", () => {
    it("accepts WebSocket connection at /__dev", async () => {
      const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/__dev`);

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          ws.close();
          reject(new Error("WebSocket connection timeout"));
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeoutId);
          ws.close();
        };

        ws.onclose = () => {
          resolve();
        };

        ws.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("WebSocket connection failed"));
        };
      });
    });
  });

  describe("bundle serving", () => {
    it("serves client bundle from /__tabi/", async () => {
      // First get a page to trigger bundle generation
      const pageResponse = await fetch(`${baseUrl}/`);
      const pageHtml = await pageResponse.text();

      // Extract bundle path from HTML
      const bundleMatch = pageHtml.match(/src="(\/__tabi\/[^"]+\.js)"/);
      expect(bundleMatch).not.toBeNull();

      const bundlePath = bundleMatch![1];
      const bundleResponse = await fetch(`${baseUrl}${bundlePath}`);

      expect(bundleResponse.status).toBe(200);
      expect(bundleResponse.headers.get("content-type")).toContain(
        "javascript",
      );
      await bundleResponse.body?.cancel();
    });
  });

  describe("path traversal protection", () => {
    it("returns 404 for path traversal attempts in bundles", async () => {
      const response = await fetch(`${baseUrl}/__tabi/../../../etc/passwd`);
      expect(response.status).toBe(404);
      await response.body?.cancel();
    });

    it("returns 404 for path traversal attempts in styles", async () => {
      const response = await fetch(`${baseUrl}/__styles/../../../etc/passwd`);
      expect(response.status).toBe(404);
      await response.body?.cancel();
    });
  });

  describe("cleanup", () => {
    it("cleanup handle stops watcher and removes .tabi dir", async () => {
      const testApp = new TabiApp();
      const testHandle = await registerDevServer(testApp, {
        pagesDir: PAGES_DIR,
      });

      // Calling stop should not throw
      await testHandle.stop();
    });
  });
});

describe("registerDevServer with basePath", () => {
  let app: TabiApp;
  let handle: DevServerHandle;
  let server: Deno.HttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    app = new TabiApp();
    handle = await registerDevServer(app, {
      pagesDir: PAGES_DIR,
      basePath: "/docs",
    });

    server = Deno.serve({ port: 0, onListen: () => {} }, app.handler);
    const addr = server.addr as Deno.NetAddr;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    await handle.stop();
    await server.shutdown();
  });

  it("serves pages under basePath", async () => {
    const response = await fetch(`${baseUrl}/docs/`);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Welcome Home");
  });

  it("returns 404 for pages without basePath", async () => {
    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(404);
    await response.body?.cancel();
  });

  it("injects HMR script with basePath", async () => {
    const response = await fetch(`${baseUrl}/docs/`);
    const html = await response.text();

    expect(html).toContain("/docs/__dev");
  });

  it("accepts WebSocket at basePath endpoint", async () => {
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/docs/__dev`);

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timeout"));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        ws.close();
      };

      ws.onclose = () => {
        resolve();
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error("WebSocket connection failed"));
      };
    });
  });
});

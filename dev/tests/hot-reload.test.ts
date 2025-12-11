import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { delay } from "@std/async";
import { createHotReloadServer } from "../hot-reload.ts";
import type { HotReloadMessage, HotReloadServer } from "../types.ts";
import { TabiTestServer } from "../../test-utils/server.ts";

describe("createHotReloadServer", () => {
  let server: TabiTestServer;
  let hotReload: HotReloadServer;

  beforeEach(() => {
    server = new TabiTestServer();
    hotReload = createHotReloadServer();

    // Register hot reload route on TabiApp using c.webSocket()
    server.app.get("/__hot-reload", (c) => {
      c.webSocket((socket: WebSocket) => {
        hotReload.handleConnection(socket);
      });
    });

    server.start();
  });

  afterEach(async () => {
    hotReload.close();
    await server.stop();
  });

  describe("clientCount", () => {
    it("should start with zero clients", () => {
      expect(hotReload.clientCount).toBe(0);
    });

    it("should track connected clients", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      // Give the server time to register the connection
      await delay(50);
      expect(hotReload.clientCount).toBe(1);

      ws.close();
      await delay(50);
      expect(hotReload.clientCount).toBe(0);
    });

    it("should track multiple clients", async () => {
      const ws1 = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const ws2 = new WebSocket(server.wsUrl("/__hot-reload").toString());

      await Promise.all([
        new Promise<void>((resolve) => {
          ws1.onopen = () => resolve();
        }),
        new Promise<void>((resolve) => {
          ws2.onopen = () => resolve();
        }),
      ]);

      await delay(50);
      expect(hotReload.clientCount).toBe(2);

      ws1.close();
      await delay(50);
      expect(hotReload.clientCount).toBe(1);

      ws2.close();
      await delay(50);
      expect(hotReload.clientCount).toBe(0);
    });
  });

  describe("reload", () => {
    it("should broadcast reload message to connected clients", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const messages: HotReloadMessage[] = [];

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      ws.onmessage = (event) => {
        messages.push(JSON.parse(event.data));
      };

      await delay(50);
      hotReload.reload();
      await delay(50);

      expect(messages.length).toBe(1);
      expect(messages[0]).toEqual({ type: "reload" });

      ws.close();
    });

    it("should broadcast to multiple clients", async () => {
      const ws1 = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const ws2 = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const messages1: HotReloadMessage[] = [];
      const messages2: HotReloadMessage[] = [];

      await Promise.all([
        new Promise<void>((resolve) => {
          ws1.onopen = () => resolve();
        }),
        new Promise<void>((resolve) => {
          ws2.onopen = () => resolve();
        }),
      ]);

      ws1.onmessage = (event) => {
        messages1.push(JSON.parse(event.data));
      };
      ws2.onmessage = (event) => {
        messages2.push(JSON.parse(event.data));
      };

      await delay(50);
      hotReload.reload();
      await delay(50);

      expect(messages1.length).toBe(1);
      expect(messages2.length).toBe(1);
      expect(messages1[0]).toEqual({ type: "reload" });
      expect(messages2[0]).toEqual({ type: "reload" });

      ws1.close();
      ws2.close();
    });

    it("should not fail when no clients connected", () => {
      // Should not throw
      expect(() => hotReload.reload()).not.toThrow();
    });
  });

  describe("sendError", () => {
    it("should truncate very long error messages", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const messages: HotReloadMessage[] = [];

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      ws.onmessage = (event) => {
        messages.push(JSON.parse(event.data));
      };

      await delay(50);
      // Create a message longer than MAX_MESSAGE_LENGTH (50,000)
      const longMessage = "x".repeat(60_000);
      const longStack = "y".repeat(60_000);
      hotReload.sendError(longMessage, longStack);
      await delay(50);

      expect(messages.length).toBe(1);
      const errorMsg = messages[0] as {
        type: "error";
        message: string;
        stack: string;
      };
      expect(errorMsg.type).toBe("error");
      expect(errorMsg.message.length).toBeLessThan(60_000);
      expect(errorMsg.message).toContain("... (truncated)");
      expect(errorMsg.stack.length).toBeLessThan(60_000);
      expect(errorMsg.stack).toContain("... (truncated)");

      ws.close();
    });

    it("should broadcast error message with message only", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const messages: HotReloadMessage[] = [];

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      ws.onmessage = (event) => {
        messages.push(JSON.parse(event.data));
      };

      await delay(50);
      hotReload.sendError("Compilation failed");
      await delay(50);

      expect(messages.length).toBe(1);
      expect(messages[0]).toEqual({
        type: "error",
        message: "Compilation failed",
      });

      ws.close();
    });

    it("should broadcast error message with stack trace", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const messages: HotReloadMessage[] = [];

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      ws.onmessage = (event) => {
        messages.push(JSON.parse(event.data));
      };

      await delay(50);
      hotReload.sendError("TypeError: Cannot read property", "at foo.ts:10:5");
      await delay(50);

      expect(messages.length).toBe(1);
      expect(messages[0]).toEqual({
        type: "error",
        message: "TypeError: Cannot read property",
        stack: "at foo.ts:10:5",
      });

      ws.close();
    });
  });

  describe("close", () => {
    it("should close all connections", async () => {
      const ws1 = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const ws2 = new WebSocket(server.wsUrl("/__hot-reload").toString());
      const closedPromises: Promise<void>[] = [];

      await Promise.all([
        new Promise<void>((resolve) => {
          ws1.onopen = () => resolve();
        }),
        new Promise<void>((resolve) => {
          ws2.onopen = () => resolve();
        }),
      ]);

      closedPromises.push(
        new Promise<void>((resolve) => {
          ws1.onclose = () => resolve();
        }),
      );
      closedPromises.push(
        new Promise<void>((resolve) => {
          ws2.onclose = () => resolve();
        }),
      );

      await delay(50);
      expect(hotReload.clientCount).toBe(2);

      hotReload.close();

      // Wait for both connections to close
      await Promise.all(closedPromises);

      expect(hotReload.clientCount).toBe(0);
    });

    it("should handle close when no clients connected", () => {
      // Should not throw
      expect(() => hotReload.close()).not.toThrow();
    });

    it("should handle multiple close calls", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      await delay(50);
      hotReload.close();

      // Second close should not throw
      expect(() => hotReload.close()).not.toThrow();
    });
  });

  describe("handleConnection", () => {
    it("should successfully accept WebSocket connection", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());

      const opened = await new Promise<boolean>((resolve) => {
        ws.onopen = () => resolve(true);
        ws.onerror = () => resolve(false);
      });

      expect(opened).toBe(true);
      ws.close();
    });

    it("should handle client disconnection", async () => {
      const ws = new WebSocket(server.wsUrl("/__hot-reload").toString());

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      await delay(50);
      expect(hotReload.clientCount).toBe(1);

      ws.close();
      await delay(50);

      expect(hotReload.clientCount).toBe(0);
    });
  });
});

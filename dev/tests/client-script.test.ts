import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { generateHotReloadScript } from "../client-script.ts";

describe("generateHotReloadScript", () => {
  describe("basic output", () => {
    it("should return a string", () => {
      const script = generateHotReloadScript();
      expect(typeof script).toBe("string");
    });

    it("should return non-empty script", () => {
      const script = generateHotReloadScript();
      expect(script.length).toBeGreaterThan(0);
    });

    it("should be valid JavaScript (IIFE format)", () => {
      const script = generateHotReloadScript();
      expect(script).toMatch(/^\(function\(\)/);
      expect(script).toMatch(/\}\)\(\);$/);
    });
  });

  describe("WebSocket path", () => {
    it("should use /__hot-reload path by default", () => {
      const script = generateHotReloadScript();
      expect(script).toContain('"/__hot-reload"');
    });

    it("should include basePath in WebSocket path", () => {
      const script = generateHotReloadScript({ basePath: "/docs" });
      expect(script).toContain('"/docs/__hot-reload"');
    });

    it("should handle empty basePath", () => {
      const script = generateHotReloadScript({ basePath: "" });
      expect(script).toContain('"/__hot-reload"');
    });

    it("should handle basePath with trailing content", () => {
      const script = generateHotReloadScript({ basePath: "/my-app/v2" });
      expect(script).toContain('"/my-app/v2/__hot-reload"');
    });
  });

  describe("WebSocket connection", () => {
    it("should create WebSocket with dynamic protocol", () => {
      const script = generateHotReloadScript();
      expect(script).toContain('location.protocol === "https:"');
      expect(script).toContain('"wss:"');
      expect(script).toContain('"ws:"');
    });

    it("should use location.host for WebSocket URL", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("location.host");
    });
  });

  describe("message handling", () => {
    it("should handle reload message type", () => {
      const script = generateHotReloadScript();
      expect(script).toContain('message.type === "reload"');
      expect(script).toContain("location.reload()");
    });

    it("should handle error message type", () => {
      const script = generateHotReloadScript();
      expect(script).toContain('message.type === "error"');
      expect(script).toContain("message.message");
      expect(script).toContain("message.stack");
    });

    it("should parse messages as JSON", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("JSON.parse");
    });
  });

  describe("reconnection logic", () => {
    it("should have reconnect functionality", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("scheduleReconnect");
    });

    it("should have initial reconnect delay", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("reconnectDelay = 1000");
    });

    it("should have maximum reconnect delay", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("maxReconnectDelay = 30000");
    });

    it("should implement exponential backoff", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("reconnectDelay * 2");
      expect(script).toContain("Math.min");
    });

    it("should reset delay on successful connection", () => {
      const script = generateHotReloadScript();
      // On open, reset delay to initial value
      expect(script).toMatch(/onopen[\s\S]*reconnectDelay = 1000/);
    });
  });

  describe("logging", () => {
    it("should log connection status", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("[hot-reload] Connected");
      expect(script).toContain("[hot-reload] Disconnected");
    });

    it("should log reload action", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("[hot-reload] Reloading");
    });

    it("should log reconnection attempts", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("[hot-reload] Reconnecting");
    });

    it("should log server errors", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("[hot-reload] Server error");
    });
  });

  describe("error handling", () => {
    it("should handle WebSocket creation errors", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("try");
      expect(script).toContain("catch");
      expect(script).toContain("Failed to create WebSocket");
    });

    it("should handle message parse errors", () => {
      const script = generateHotReloadScript();
      expect(script).toContain("Failed to parse message");
    });
  });

  describe("scope isolation", () => {
    it("should use IIFE to avoid global pollution", () => {
      const script = generateHotReloadScript();
      // Variables should be declared with var inside IIFE, not globally
      expect(script).toMatch(/\(function\(\)\s*\{[\s\S]*var\s+/);
    });

    it("should not export any globals", () => {
      const script = generateHotReloadScript();
      // Should not use window.* assignments
      expect(script).not.toContain("window.");
      expect(script).not.toContain("globalThis.");
    });
  });

  describe("security - basePath validation", () => {
    it("should accept valid basePath values", () => {
      // Valid paths that match BASE_PATH_REGEX
      expect(() => generateHotReloadScript({ basePath: "" })).not.toThrow();
      expect(() => generateHotReloadScript({ basePath: "/docs" })).not
        .toThrow();
      expect(() => generateHotReloadScript({ basePath: "/my-app" })).not
        .toThrow();
      expect(() => generateHotReloadScript({ basePath: "/my_app" })).not
        .toThrow();
      expect(() => generateHotReloadScript({ basePath: "/docs/v2" })).not
        .toThrow();
      expect(() => generateHotReloadScript({ basePath: "/a/b/c/d" })).not
        .toThrow();
    });

    it("should reject basePath with script injection attempts", () => {
      expect(() =>
        generateHotReloadScript({
          basePath: '</script><script>alert("XSS")</script>',
        })
      ).toThrow(/Invalid basePath/);
    });

    it("should reject basePath with quote injection attempts", () => {
      expect(() => generateHotReloadScript({ basePath: '"; alert("XSS"); //' }))
        .toThrow(/Invalid basePath/);
    });

    it("should reject basePath with uppercase characters", () => {
      expect(() => generateHotReloadScript({ basePath: "/Docs" })).toThrow(
        /Invalid basePath/,
      );
    });

    it("should reject basePath not starting with /", () => {
      expect(() => generateHotReloadScript({ basePath: "docs" })).toThrow(
        /Invalid basePath/,
      );
    });

    it("should reject basePath with special characters", () => {
      expect(() => generateHotReloadScript({ basePath: "/docs?foo=bar" }))
        .toThrow(/Invalid basePath/);

      expect(() => generateHotReloadScript({ basePath: "/docs#anchor" }))
        .toThrow(/Invalid basePath/);

      expect(() => generateHotReloadScript({ basePath: "/docs/../etc" }))
        .toThrow(/Invalid basePath/);
    });

    it("should reject basePath with spaces", () => {
      expect(() => generateHotReloadScript({ basePath: "/my docs" })).toThrow(
        /Invalid basePath/,
      );
    });
  });
});

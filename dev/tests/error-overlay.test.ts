import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { renderErrorOverlay } from "../error-overlay.ts";

describe("renderErrorOverlay", () => {
  describe("basic output", () => {
    it("should return a string", () => {
      const html = renderErrorOverlay({ message: "Test error" });
      expect(typeof html).toBe("string");
    });

    it("should return a complete HTML document", () => {
      const html = renderErrorOverlay({ message: "Test error" });
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });

    it("should include head with meta tags", () => {
      const html = renderErrorOverlay({ message: "Test error" });
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain("viewport");
    });

    it("should have error title", () => {
      const html = renderErrorOverlay({ message: "Test error" });
      expect(html).toContain("<title>Error - Development Server</title>");
    });
  });

  describe("message display", () => {
    it("should display the error message", () => {
      const html = renderErrorOverlay({ message: "Failed to compile page" });
      expect(html).toContain("Failed to compile page");
    });

    it("should escape HTML in message to prevent XSS", () => {
      const html = renderErrorOverlay({
        message: '<script>alert("XSS")</script>',
      });
      expect(html).not.toContain("<script>alert");
      expect(html).toContain("&lt;script&gt;");
    });

    it("should escape special characters in message", () => {
      const html = renderErrorOverlay({
        message: 'Error with "quotes" & <brackets>',
      });
      expect(html).toContain("&quot;quotes&quot;");
      expect(html).toContain("&amp;");
      expect(html).toContain("&lt;brackets&gt;");
    });
  });

  describe("stack trace display", () => {
    it("should display stack trace when provided", () => {
      const html = renderErrorOverlay({
        message: "Error occurred",
        stack: "Error: Something went wrong\n    at test.ts:10:5",
      });
      expect(html).toContain("Stack Trace");
      expect(html).toContain("Error: Something went wrong");
      expect(html).toContain("at test.ts:10:5");
    });

    it("should not display stack section when stack is not provided", () => {
      const html = renderErrorOverlay({ message: "Error occurred" });
      expect(html).not.toContain("Stack Trace</div>");
      expect(html).not.toContain('<div class="stack">');
    });

    it("should escape HTML in stack trace to prevent XSS", () => {
      const html = renderErrorOverlay({
        message: "Error",
        stack: '<img src=x onerror="alert(1)">',
      });
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });

    it("should preserve newlines in stack trace", () => {
      const html = renderErrorOverlay({
        message: "Error",
        stack: "Line 1\nLine 2\nLine 3",
      });
      // The stack is in a <pre> tag, so newlines are preserved
      expect(html).toContain("Line 1\nLine 2\nLine 3");
    });
  });

  describe("hot reload script", () => {
    it("should include hot reload script", () => {
      const html = renderErrorOverlay({ message: "Error" });
      // Check for hot reload script content
      expect(html).toContain("__hot-reload");
      expect(html).toContain("WebSocket");
    });

    it("should include hot reload script with default basePath", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain('wsPath = "/__hot-reload"');
    });

    it("should include hot reload script with custom basePath", () => {
      const html = renderErrorOverlay({
        message: "Error",
        basePath: "/docs",
      });
      expect(html).toContain('wsPath = "/docs/__hot-reload"');
    });
  });

  describe("inline styles", () => {
    it("should include inline styles", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    it("should not reference external stylesheets", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).not.toContain('rel="stylesheet"');
      expect(html).not.toContain("href=");
    });

    it("should have dark theme colors", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("background-color: #1a1a1a");
      expect(html).toContain("color: #f5f5f5");
    });

    it("should have red error styling", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("#dc2626"); // Red color for error indicator
      expect(html).toContain("#ef4444"); // Lighter red for text
    });
  });

  describe("user experience", () => {
    it("should have waiting message for hot reload", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("Waiting for changes");
      expect(html).toContain("reload automatically");
    });

    it("should have Build Error heading", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("Build Error");
    });

    it("should have error icon", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("error-icon");
    });

    it("should have pulse animation for waiting indicator", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain("pulse");
      expect(html).toContain("@keyframes pulse");
    });
  });

  describe("basePath handling", () => {
    it("should use empty basePath by default", () => {
      const html = renderErrorOverlay({ message: "Error" });
      expect(html).toContain('wsPath = "/__hot-reload"');
    });

    it("should pass basePath to hot reload script", () => {
      const html = renderErrorOverlay({
        message: "Error",
        basePath: "/my-app",
      });
      expect(html).toContain('wsPath = "/my-app/__hot-reload"');
    });

    it("should handle nested basePath", () => {
      const html = renderErrorOverlay({
        message: "Error",
        basePath: "/app/v2",
      });
      expect(html).toContain('wsPath = "/app/v2/__hot-reload"');
    });
  });
});

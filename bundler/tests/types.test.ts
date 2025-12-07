import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { BundleError } from "../types.ts";

describe("BundleError", () => {
  describe("construction", () => {
    it("creates error with message and route", () => {
      const error = new BundleError("Bundle failed", "/blog/post");

      expect(error.message).toBe("Bundle failed");
      expect(error.route).toBe("/blog/post");
      expect(error.name).toBe("BundleError");
    });

    it("creates error with root route", () => {
      const error = new BundleError("Entry generation failed", "/");

      expect(error.message).toBe("Entry generation failed");
      expect(error.route).toBe("/");
    });

    it("creates error with nested route", () => {
      const error = new BundleError(
        "esbuild compilation failed",
        "/docs/api/client",
      );

      expect(error.route).toBe("/docs/api/client");
    });
  });

  describe("error options", () => {
    it("accepts cause option", () => {
      const originalError = new Error("Original esbuild error");
      const error = new BundleError("Bundle failed", "/about", {
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });

    it("works without cause option", () => {
      const error = new BundleError("Bundle failed", "/about");

      expect(error.cause).toBeUndefined();
    });
  });

  describe("inheritance", () => {
    it("is an instance of Error", () => {
      const error = new BundleError("Test error", "/test");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BundleError);
    });

    it("has correct name property", () => {
      const error = new BundleError("Test error", "/test");

      expect(error.name).toBe("BundleError");
    });

    it("has stack trace", () => {
      const error = new BundleError("Test error", "/test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("BundleError");
    });
  });

  describe("realistic error scenarios", () => {
    it("handles esbuild failure message", () => {
      const esbuildError = new Error(
        'Could not resolve "preact" (mark it as external to exclude from bundle)',
      );
      const error = new BundleError(
        `Failed to bundle client: ${esbuildError.message}`,
        "/dashboard",
        { cause: esbuildError },
      );

      expect(error.message).toContain("Failed to bundle client");
      expect(error.message).toContain("Could not resolve");
      expect(error.route).toBe("/dashboard");
      expect(error.cause).toBe(esbuildError);
    });

    it("handles entry generation failure", () => {
      const error = new BundleError(
        "Invalid page type: expected markdown or tsx",
        "/invalid",
      );

      expect(error.message).toContain("Invalid page type");
      expect(error.route).toBe("/invalid");
    });

    it("handles file system error", () => {
      const fsError = new Error("ENOENT: no such file or directory");
      const error = new BundleError(
        `Failed to write bundle: ${fsError.message}`,
        "/blog/article",
        { cause: fsError },
      );

      expect(error.message).toContain("Failed to write bundle");
      expect(error.message).toContain("ENOENT");
    });
  });
});

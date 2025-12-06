import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { loadLayout } from "../layout-loader.ts";
import { LoaderError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

describe("loadLayout", () => {
  describe("valid layouts", () => {
    it("loads layout with default export", async () => {
      const filePath = `${FIXTURES_DIR}valid-layout.tsx`;
      const directory = "/pages/blog";
      const result = await loadLayout(filePath, directory);

      expect(typeof result.component).toBe("function");
      expect(result.filePath).toBe(filePath);
      expect(result.directory).toBe(directory);
    });
  });

  describe("missing default export", () => {
    it("throws LoaderError when no default export", async () => {
      const filePath = `${FIXTURES_DIR}no-default-layout.tsx`;

      try {
        await loadLayout(filePath, "/pages");
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toBe(
          "Layout must have a default export that is a component function",
        );
      }
    });
  });

  describe("file not found", () => {
    it("throws LoaderError for non-existent file", async () => {
      const filePath = `${FIXTURES_DIR}does-not-exist.tsx`;

      try {
        await loadLayout(filePath, "/pages");
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).filePath).toBe(filePath);
      }
    });
  });
});

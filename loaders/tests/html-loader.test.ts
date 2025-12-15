import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { loadDocument } from "../html-loader.ts";
import { LoaderError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

describe("loadDocument", () => {
  describe("valid documents", () => {
    it("loads document with default export", async () => {
      const filePath = `${FIXTURES_DIR}valid-document.tsx`;
      const result = await loadDocument(filePath);

      expect(typeof result.component).toBe("function");
      expect(result.filePath).toBe(filePath);
    });
  });

  describe("missing default export", () => {
    it("throws LoaderError when no default export", async () => {
      const filePath = `${FIXTURES_DIR}no-default-document.tsx`;

      try {
        await loadDocument(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toBe(
          "Document must have a default export that is a component function",
        );
      }
    });
  });

  describe("file not found", () => {
    it("throws LoaderError for non-existent file", async () => {
      const filePath = `${FIXTURES_DIR}does-not-exist-document.tsx`;

      try {
        await loadDocument(filePath);
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

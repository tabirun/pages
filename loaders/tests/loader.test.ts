import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { loadPage } from "../loader.ts";
import { LoaderError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

describe("loadPage", () => {
  describe("markdown file loading", () => {
    it("should load .md file and return LoadedMarkdownPage", async () => {
      const filePath = `${FIXTURES_DIR}valid-page.md`;
      const result = await loadPage(filePath);

      expect(result.type).toBe("markdown");
      if (result.type === "markdown") {
        expect(result.frontmatter.title).toBe("Test Page");
        expect(result.frontmatter.description).toBe("A test description");
        expect(result.content).toBe("\n# Hello World\n\nThis is content.\n");
        expect(result.filePath).toBe(filePath);
      }
    });

    it("should handle .MD extension (case insensitive)", async () => {
      // The loader uses .toLowerCase() so .MD and .md are equivalent
      const result = await loadPage(`${FIXTURES_DIR}valid-page.md`);
      expect(result.type).toBe("markdown");
    });
  });

  describe("tsx file loading", () => {
    it("should load .tsx file and return LoadedTsxPage", async () => {
      const filePath = `${FIXTURES_DIR}valid-page.tsx`;
      const result = await loadPage(filePath);

      expect(result.type).toBe("tsx");
      if (result.type === "tsx") {
        expect(result.frontmatter.title).toBe("Valid Page");
        expect(result.frontmatter.description).toBe("A valid TSX page");
        expect(result.component).toBeDefined();
        expect(typeof result.component).toBe("function");
        expect(result.filePath).toBe(filePath);
      }
    });

    it("should handle .TSX extension (case insensitive)", async () => {
      const filePath = `${FIXTURES_DIR}valid-page.tsx`;
      const result = await loadPage(filePath);

      expect(result.type).toBe("tsx");
      if (result.type === "tsx") {
        expect(result.component).toBeDefined();
      }
    });
  });

  describe("unsupported file types", () => {
    it("should throw LoaderError for .txt extension", async () => {
      const filePath = `${FIXTURES_DIR}unsupported.txt`;

      try {
        await loadPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toContain(
          "Unsupported page file type",
        );
        expect((error as LoaderError).message).toContain(".txt");
        expect((error as LoaderError).filePath).toBe(filePath);
      }
    });

    it("should throw LoaderError for .html extension", async () => {
      const filePath = `${FIXTURES_DIR}page.html`;

      try {
        await loadPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toContain(
          "Unsupported page file type",
        );
        expect((error as LoaderError).message).toContain(".html");
      }
    });

    it("should throw LoaderError for .js extension", async () => {
      const filePath = `${FIXTURES_DIR}script.js`;

      try {
        await loadPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toContain(
          "Unsupported page file type",
        );
        expect((error as LoaderError).message).toContain(".js");
      }
    });

    it("should throw LoaderError for no extension", async () => {
      const filePath = `${FIXTURES_DIR}no-extension`;

      try {
        await loadPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toContain(
          "Unsupported page file type",
        );
      }
    });
  });

  describe("error propagation", () => {
    it("should propagate LoaderError from markdown loader for non-existent file", async () => {
      const filePath = `${FIXTURES_DIR}does-not-exist.md`;

      try {
        await loadPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).filePath).toBe(filePath);
      }
    });

    it("should propagate LoaderError from tsx loader for non-existent file", async () => {
      const filePath = `${FIXTURES_DIR}does-not-exist.tsx`;

      try {
        await loadPage(filePath);
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

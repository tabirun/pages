import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { loadTsxPage } from "../tsx-loader.ts";
import { FrontmatterError, LoaderError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

describe("loadTsxPage", () => {
  describe("valid TSX pages", () => {
    it("loads TSX page with frontmatter export", async () => {
      const filePath = `${FIXTURES_DIR}valid-page.tsx`;
      const result = await loadTsxPage(filePath);

      expect(result.type).toBe("tsx");
      expect(result.frontmatter.title).toBe("Valid Page");
      expect(result.frontmatter.description).toBe("A valid TSX page");
      expect(typeof result.component).toBe("function");
      expect(result.filePath).toBe(filePath);
    });

    it("loads TSX page without frontmatter export", async () => {
      const filePath = `${FIXTURES_DIR}no-frontmatter-page.tsx`;
      const result = await loadTsxPage(filePath);

      expect(result.type).toBe("tsx");
      expect(result.frontmatter).toEqual({});
      expect(typeof result.component).toBe("function");
    });

    it("loads TSX page with draft field", async () => {
      const filePath = `${FIXTURES_DIR}draft-page.tsx`;
      const result = await loadTsxPage(filePath);

      expect(result.frontmatter.draft).toBe(true);
      expect(result.frontmatter.title).toBe("Draft Page");
    });

    it("loads TSX page with custom fields", async () => {
      const filePath = `${FIXTURES_DIR}custom-fields-page.tsx`;
      const result = await loadTsxPage(filePath);

      expect(result.frontmatter.author).toBe("Jane Doe");
      expect(result.frontmatter.tags).toEqual(["react", "typescript"]);
    });
  });

  describe("missing default export", () => {
    it("throws LoaderError when no default export", async () => {
      const filePath = `${FIXTURES_DIR}no-default-export.tsx`;

      try {
        await loadTsxPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toBe(
          "TSX page must have a default export that is a component function",
        );
      }
    });
  });

  describe("invalid frontmatter", () => {
    it("throws LoaderError when frontmatter is a string", async () => {
      const filePath = `${FIXTURES_DIR}invalid-frontmatter-page.tsx`;

      try {
        await loadTsxPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toBe(
          "TSX page frontmatter export must be an object",
        );
      }
    });

    it("throws LoaderError when frontmatter is an array", async () => {
      const filePath = `${FIXTURES_DIR}array-frontmatter-page.tsx`;

      try {
        await loadTsxPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).message).toBe(
          "TSX page frontmatter export must be an object",
        );
      }
    });

    it("throws FrontmatterError when schema validation fails", async () => {
      const filePath = `${FIXTURES_DIR}invalid-schema-page.tsx`;

      try {
        await loadTsxPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(FrontmatterError);
        expect((error as FrontmatterError).validationErrors.issues.length)
          .toBeGreaterThan(0);
      }
    });
  });

  describe("file not found", () => {
    it("throws LoaderError for non-existent file", async () => {
      const filePath = `${FIXTURES_DIR}does-not-exist.tsx`;

      try {
        await loadTsxPage(filePath);
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

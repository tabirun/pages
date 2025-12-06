import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { loadMarkdownPage } from "../markdown-loader.ts";
import { LoaderError } from "../types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

describe("loadMarkdownPage", () => {
  describe("valid markdown files", () => {
    it("loads markdown with frontmatter", async () => {
      const filePath = `${FIXTURES_DIR}valid-page.md`;
      const result = await loadMarkdownPage(filePath);

      expect(result.type).toBe("markdown");
      expect(result.frontmatter.title).toBe("Test Page");
      expect(result.frontmatter.description).toBe("A test description");
      expect(result.content).toBe("\n# Hello World\n\nThis is content.\n");
      expect(result.filePath).toBe(filePath);
    });

    it("loads markdown without frontmatter", async () => {
      const filePath = `${FIXTURES_DIR}no-frontmatter.md`;
      const result = await loadMarkdownPage(filePath);

      expect(result.type).toBe("markdown");
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe("# Just Content\n\nNo frontmatter.\n");
    });

    it("loads markdown with draft field", async () => {
      const filePath = `${FIXTURES_DIR}draft-page.md`;
      const result = await loadMarkdownPage(filePath);

      expect(result.frontmatter.draft).toBe(true);
    });

    it("loads markdown with custom fields", async () => {
      const filePath = `${FIXTURES_DIR}custom-fields.md`;
      const result = await loadMarkdownPage(filePath);

      expect(result.frontmatter.author).toBe("John Doe");
      expect(result.frontmatter.tags).toEqual(["typescript", "deno"]);
    });
  });

  describe("file not found", () => {
    it("throws LoaderError for non-existent file", async () => {
      const filePath = `${FIXTURES_DIR}does-not-exist.md`;

      try {
        await loadMarkdownPage(filePath);
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

  describe("invalid frontmatter", () => {
    it("throws LoaderError for invalid YAML", async () => {
      const filePath = `${FIXTURES_DIR}invalid-yaml.md`;

      try {
        await loadMarkdownPage(filePath);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
      }
    });
  });
});

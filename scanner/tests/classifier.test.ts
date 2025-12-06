import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { classifyFile } from "../classifier.ts";

describe("classifyFile", () => {
  describe("markdown pages", () => {
    it("should classify .md files as markdown pages", () => {
      const result = classifyFile("index.md");
      expect(result).toEqual({ type: "page", pageType: "markdown" });
    });

    it("should classify nested .md files as markdown pages", () => {
      const result = classifyFile("blog/post.md");
      expect(result).toEqual({ type: "page", pageType: "markdown" });
    });

    it("should classify deeply nested .md files as markdown pages", () => {
      const result = classifyFile("/abs/path/pages/docs/guide/intro.md");
      expect(result).toEqual({ type: "page", pageType: "markdown" });
    });
  });

  describe("tsx pages", () => {
    it("should classify .tsx files as tsx pages", () => {
      const result = classifyFile("about.tsx");
      expect(result).toEqual({ type: "page", pageType: "tsx" });
    });

    it("should classify index.tsx as tsx page", () => {
      const result = classifyFile("index.tsx");
      expect(result).toEqual({ type: "page", pageType: "tsx" });
    });

    it("should classify nested .tsx files as tsx pages", () => {
      const result = classifyFile("components/hero.tsx");
      expect(result).toEqual({ type: "page", pageType: "tsx" });
    });
  });

  describe("layout files", () => {
    it("should classify _layout.tsx as layout", () => {
      const result = classifyFile("_layout.tsx");
      expect(result).toEqual({ type: "layout" });
    });

    it("should classify nested _layout.tsx as layout", () => {
      const result = classifyFile("blog/_layout.tsx");
      expect(result).toEqual({ type: "layout" });
    });

    it("should classify deeply nested _layout.tsx as layout", () => {
      const result = classifyFile("/abs/path/pages/docs/_layout.tsx");
      expect(result).toEqual({ type: "layout" });
    });
  });

  describe("system files", () => {
    it("should classify _html.tsx as system html", () => {
      const result = classifyFile("_html.tsx");
      expect(result).toEqual({ type: "system", systemType: "html" });
    });

    it("should classify _not-found.tsx as system notFound", () => {
      const result = classifyFile("_not-found.tsx");
      expect(result).toEqual({ type: "system", systemType: "notFound" });
    });

    it("should classify _error.tsx as system error", () => {
      const result = classifyFile("_error.tsx");
      expect(result).toEqual({ type: "system", systemType: "error" });
    });

    it("should classify nested system files correctly", () => {
      const result = classifyFile("pages/_html.tsx");
      expect(result).toEqual({ type: "system", systemType: "html" });
    });
  });

  describe("other files", () => {
    it("should classify underscore-prefixed tsx as other", () => {
      const result = classifyFile("_private.tsx");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify _components.tsx as other", () => {
      const result = classifyFile("_components.tsx");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify nested _utils.tsx as other", () => {
      const result = classifyFile("blog/_utils.tsx");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify .ts files as other", () => {
      const result = classifyFile("utils.ts");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify .js files as other", () => {
      const result = classifyFile("script.js");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify .json files as other", () => {
      const result = classifyFile("package.json");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify .css files as other", () => {
      const result = classifyFile("styles.css");
      expect(result).toEqual({ type: "other" });
    });

    it("should classify files without extension as other", () => {
      const result = classifyFile("README");
      expect(result).toEqual({ type: "other" });
    });
  });
});

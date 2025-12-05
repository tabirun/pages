import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { buildLayoutChain } from "../layouts.ts";

describe("buildLayoutChain", () => {
  describe("no layouts", () => {
    it("should return empty array when no layouts exist", () => {
      const layouts = new Map<string, string>();
      const chain = buildLayoutChain("index.md", layouts);
      expect(chain).toEqual([]);
    });

    it("should return empty array for nested page with no layouts", () => {
      const layouts = new Map<string, string>();
      const chain = buildLayoutChain("blog/post.md", layouts);
      expect(chain).toEqual([]);
    });
  });

  describe("root layout only", () => {
    it("should return root layout for root page", () => {
      const layouts = new Map([["", "/pages/_layout.tsx"]]);
      const chain = buildLayoutChain("index.md", layouts);
      expect(chain).toEqual(["/pages/_layout.tsx"]);
    });

    it("should return root layout for nested page", () => {
      const layouts = new Map([["", "/pages/_layout.tsx"]]);
      const chain = buildLayoutChain("blog/post.md", layouts);
      expect(chain).toEqual(["/pages/_layout.tsx"]);
    });

    it("should return root layout for deeply nested page", () => {
      const layouts = new Map([["", "/pages/_layout.tsx"]]);
      const chain = buildLayoutChain("docs/api/v1/intro.md", layouts);
      expect(chain).toEqual(["/pages/_layout.tsx"]);
    });
  });

  describe("nested layouts", () => {
    it("should return chain from root to leaf", () => {
      const layouts = new Map([
        ["", "/pages/_layout.tsx"],
        ["blog", "/pages/blog/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("blog/post.md", layouts);
      expect(chain).toEqual([
        "/pages/_layout.tsx",
        "/pages/blog/_layout.tsx",
      ]);
    });

    it("should return chain for deeply nested page", () => {
      const layouts = new Map([
        ["", "/pages/_layout.tsx"],
        ["docs", "/pages/docs/_layout.tsx"],
        ["docs/api", "/pages/docs/api/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("docs/api/methods.md", layouts);
      expect(chain).toEqual([
        "/pages/_layout.tsx",
        "/pages/docs/_layout.tsx",
        "/pages/docs/api/_layout.tsx",
      ]);
    });
  });

  describe("partial layouts", () => {
    it("should skip missing intermediate layouts", () => {
      const layouts = new Map([
        ["", "/pages/_layout.tsx"],
        ["docs/api", "/pages/docs/api/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("docs/api/methods.md", layouts);
      expect(chain).toEqual([
        "/pages/_layout.tsx",
        "/pages/docs/api/_layout.tsx",
      ]);
    });

    it("should skip missing root layout", () => {
      const layouts = new Map([
        ["blog", "/pages/blog/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("blog/post.md", layouts);
      expect(chain).toEqual(["/pages/blog/_layout.tsx"]);
    });

    it("should return only leaf layout", () => {
      const layouts = new Map([
        ["docs/api/v1", "/pages/docs/api/v1/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("docs/api/v1/intro.md", layouts);
      expect(chain).toEqual(["/pages/docs/api/v1/_layout.tsx"]);
    });
  });

  describe("unrelated layouts", () => {
    it("should not include layouts from sibling directories", () => {
      const layouts = new Map([
        ["", "/pages/_layout.tsx"],
        ["blog", "/pages/blog/_layout.tsx"],
        ["docs", "/pages/docs/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("blog/post.md", layouts);
      expect(chain).toEqual([
        "/pages/_layout.tsx",
        "/pages/blog/_layout.tsx",
      ]);
    });

    it("should not include layouts from child directories", () => {
      const layouts = new Map([
        ["", "/pages/_layout.tsx"],
        ["docs", "/pages/docs/_layout.tsx"],
        ["docs/api", "/pages/docs/api/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("docs/intro.md", layouts);
      expect(chain).toEqual([
        "/pages/_layout.tsx",
        "/pages/docs/_layout.tsx",
      ]);
    });
  });

  describe("path normalization", () => {
    it("should handle Windows backslashes", () => {
      const layouts = new Map([
        ["", "/pages/_layout.tsx"],
        ["blog", "/pages/blog/_layout.tsx"],
      ]);
      const chain = buildLayoutChain("blog\\post.md", layouts);
      expect(chain).toEqual([
        "/pages/_layout.tsx",
        "/pages/blog/_layout.tsx",
      ]);
    });
  });
});

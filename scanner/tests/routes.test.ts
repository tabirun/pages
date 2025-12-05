import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { filePathToRoute, publicPathToRoute } from "../routes.ts";

describe("filePathToRoute", () => {
  describe("edge cases", () => {
    it("should pass through non-page extensions unchanged", () => {
      expect(filePathToRoute("utils.ts")).toBe("/utils.ts");
      expect(filePathToRoute("script.js")).toBe("/script.js");
    });

    it("should handle files with dots in name", () => {
      expect(filePathToRoute("file.config.md")).toBe("/file.config");
    });
  });

  describe("basic routes", () => {
    it("should convert root index.md to /", () => {
      expect(filePathToRoute("index.md")).toBe("/");
    });

    it("should convert root index.tsx to /", () => {
      expect(filePathToRoute("index.tsx")).toBe("/");
    });

    it("should convert about.tsx to /about", () => {
      expect(filePathToRoute("about.tsx")).toBe("/about");
    });

    it("should convert about.md to /about", () => {
      expect(filePathToRoute("about.md")).toBe("/about");
    });
  });

  describe("nested routes", () => {
    it("should convert blog/index.md to /blog", () => {
      expect(filePathToRoute("blog/index.md")).toBe("/blog");
    });

    it("should convert blog/hello-world.md to /blog/hello-world", () => {
      expect(filePathToRoute("blog/hello-world.md")).toBe("/blog/hello-world");
    });

    it("should convert docs/getting-started.tsx to /docs/getting-started", () => {
      expect(filePathToRoute("docs/getting-started.tsx")).toBe(
        "/docs/getting-started",
      );
    });
  });

  describe("deeply nested routes", () => {
    it("should convert docs/guide/intro.md to /docs/guide/intro", () => {
      expect(filePathToRoute("docs/guide/intro.md")).toBe("/docs/guide/intro");
    });

    it("should convert docs/api/v1/index.tsx to /docs/api/v1", () => {
      expect(filePathToRoute("docs/api/v1/index.tsx")).toBe("/docs/api/v1");
    });
  });

  describe("path separator normalization", () => {
    it("should normalize Windows backslashes", () => {
      expect(filePathToRoute("blog\\post.md")).toBe("/blog/post");
    });

    it("should normalize nested Windows backslashes", () => {
      expect(filePathToRoute("docs\\guide\\intro.md")).toBe(
        "/docs/guide/intro",
      );
    });

    it("should handle Windows index paths", () => {
      expect(filePathToRoute("blog\\index.md")).toBe("/blog");
    });
  });
});

describe("publicPathToRoute", () => {
  describe("basic assets", () => {
    it("should convert favicon.ico to /favicon.ico", () => {
      expect(publicPathToRoute("favicon.ico")).toBe("/favicon.ico");
    });

    it("should convert robots.txt to /robots.txt", () => {
      expect(publicPathToRoute("robots.txt")).toBe("/robots.txt");
    });
  });

  describe("nested assets", () => {
    it("should convert images/logo.png to /images/logo.png", () => {
      expect(publicPathToRoute("images/logo.png")).toBe("/images/logo.png");
    });

    it("should convert assets/css/styles.css to /assets/css/styles.css", () => {
      expect(publicPathToRoute("assets/css/styles.css")).toBe(
        "/assets/css/styles.css",
      );
    });
  });

  describe("path separator normalization", () => {
    it("should normalize Windows backslashes", () => {
      expect(publicPathToRoute("images\\logo.png")).toBe("/images/logo.png");
    });

    it("should normalize nested Windows backslashes", () => {
      expect(publicPathToRoute("assets\\images\\hero.jpg")).toBe(
        "/assets/images/hero.jpg",
      );
    });
  });
});

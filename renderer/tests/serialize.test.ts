import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { serializePageData } from "../serialize.ts";
import type { LoadedMarkdownPage, LoadedTsxPage } from "../../loaders/mod.ts";

describe("serializePageData", () => {
  describe("markdown pages", () => {
    it("serializes markdown page with frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Building a Static Site Generator",
          description: "A deep dive into SSG architecture and implementation",
          author: "Jane Smith",
          tags: ["typescript", "deno", "ssg"],
        },
        content: "# Article content...",
        filePath: "/pages/blog/building-ssg.md",
      };

      const result = serializePageData(page, "/blog/building-ssg");

      // Verify script tag structure
      expect(result).toMatch(
        /^<script id="__TABI_DATA__" type="application\/json">/,
      );
      expect(result).toMatch(/<\/script>$/);

      // Extract and parse JSON
      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      expect(jsonMatch).not.toBeNull();

      // Unescape HTML entities to get valid JSON
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.pageType).toBe("markdown");
      expect(data.route).toBe("/blog/building-ssg");
      expect(data.frontmatter.title).toBe("Building a Static Site Generator");
      expect(data.frontmatter.description).toBe(
        "A deep dive into SSG architecture and implementation",
      );
      expect(data.frontmatter.author).toBe("Jane Smith");
      expect(data.frontmatter.tags).toEqual(["typescript", "deno", "ssg"]);
    });

    it("serializes markdown page with empty frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {},
        content: "# Simple page content",
        filePath: "/pages/simple.md",
      };

      const result = serializePageData(page, "/simple");

      // Extract and parse JSON
      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.pageType).toBe("markdown");
      expect(data.route).toBe("/simple");
      expect(data.frontmatter).toEqual({});
    });

    it("serializes markdown page with draft field", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Work in Progress",
          draft: true,
        },
        content: "# Draft content",
        filePath: "/pages/drafts/wip.md",
      };

      const result = serializePageData(page, "/drafts/wip");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.draft).toBe(true);
    });
  });

  describe("tsx pages", () => {
    it("serializes tsx page with frontmatter", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Dashboard",
          description: "User dashboard with analytics",
        },
        component: () => null,
        filePath: "/pages/dashboard.tsx",
      };

      const result = serializePageData(page, "/dashboard");

      // Verify script tag structure
      expect(result).toMatch(
        /^<script id="__TABI_DATA__" type="application\/json">/,
      );
      expect(result).toMatch(/<\/script>$/);

      // Extract and parse JSON
      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.pageType).toBe("tsx");
      expect(data.route).toBe("/dashboard");
      expect(data.frontmatter.title).toBe("Dashboard");
      expect(data.frontmatter.description).toBe(
        "User dashboard with analytics",
      );
    });
  });

  describe("XSS prevention", () => {
    it("escapes </script> tag in frontmatter title", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Preventing XSS </script><script>alert('xss')</script>",
          description: "Security article",
        },
        content: "# Security content",
        filePath: "/pages/security.md",
      };

      const result = serializePageData(page, "/security");

      // Verify </script> is escaped and cannot break out
      expect(result).not.toContain("</script><script>alert('xss')</script>");
      expect(result).toContain("&lt;/script&gt;");
      expect(result).toContain("&lt;script&gt;");

      // Verify it only closes once at the end
      const scriptTags = result.match(/<\/script>/g);
      expect(scriptTags).not.toBeNull();
      expect(scriptTags!.length).toBe(1);
    });

    it("escapes HTML entities in frontmatter description", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "HTML & Special Characters",
          description: 'Using <div>, <span>, and "quotes"',
        },
        content: "# Content",
        filePath: "/pages/html-chars.md",
      };

      const result = serializePageData(page, "/html-chars");

      // Verify HTML entities are escaped
      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&quot;");

      // Extract and verify data is parseable
      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.title).toBe("HTML & Special Characters");
      expect(data.frontmatter.description).toBe(
        'Using <div>, <span>, and "quotes"',
      );
    });

    it("escapes single quotes in frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "John's Blog Post",
          description: "It's a great article",
        },
        content: "# Content",
        filePath: "/pages/johns-post.md",
      };

      const result = serializePageData(page, "/johns-post");

      expect(result).toContain("&#39;");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.title).toBe("John's Blog Post");
      expect(data.frontmatter.description).toBe("It's a great article");
    });

    it("escapes malicious JSON injection attempts", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: 'Test","malicious":"injected',
          description: 'Break out"}{"evil": true',
        },
        content: "# Content",
        filePath: "/pages/injection.md",
      };

      const result = serializePageData(page, "/injection");

      // Verify quotes are escaped
      expect(result).toContain("&quot;");

      // Extract and verify JSON is valid
      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      // Verify the malicious content was escaped and treated as a value
      expect(data.frontmatter.title).toBe('Test","malicious":"injected');
      expect(data.frontmatter.description).toBe('Break out"}{"evil": true');
      expect(data.frontmatter.malicious).toBeUndefined();
      expect(data.frontmatter.evil).toBeUndefined();
    });
  });

  describe("output format", () => {
    it("includes correct script tag id", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Test" },
        content: "# Content",
        filePath: "/pages/test.md",
      };

      const result = serializePageData(page, "/test");

      expect(result).toContain('id="__TABI_DATA__"');
    });

    it("includes correct script type", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Test" },
        content: "# Content",
        filePath: "/pages/test.md",
      };

      const result = serializePageData(page, "/test");

      expect(result).toContain('type="application/json"');
    });

    it("produces single-line output", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Multiline Test",
          description: "Testing output",
        },
        content: "# Content",
        filePath: "/pages/test.md",
      };

      const result = serializePageData(page, "/test");

      // Should not contain newlines
      expect(result).not.toContain("\n");
      expect(result).not.toContain("\r");
    });

    it("handles routes with nested paths", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Nested Page" },
        content: "# Content",
        filePath: "/pages/blog/2024/article.md",
      };

      const result = serializePageData(page, "/blog/2024/article");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.route).toBe("/blog/2024/article");
    });

    it("handles root route", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Home" },
        content: "# Welcome",
        filePath: "/pages/index.md",
      };

      const result = serializePageData(page, "/");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.route).toBe("/");
    });
  });

  describe("complex frontmatter", () => {
    it("handles nested objects in frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Advanced Configuration",
          meta: {
            author: "Jane Smith",
            publishedAt: "2024-03-15",
            social: {
              twitter: "@janesmith",
              github: "janesmith",
            },
          },
        },
        content: "# Content",
        filePath: "/pages/advanced.md",
      };

      const result = serializePageData(page, "/advanced");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.meta.author).toBe("Jane Smith");
      expect(data.frontmatter.meta.social.twitter).toBe("@janesmith");
    });

    it("handles arrays in frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Technologies",
          tags: ["TypeScript", "Deno", "Preact"],
          versions: [1, 2, 3],
        },
        content: "# Content",
        filePath: "/pages/tech.md",
      };

      const result = serializePageData(page, "/tech");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.tags).toEqual(["TypeScript", "Deno", "Preact"]);
      expect(data.frontmatter.versions).toEqual([1, 2, 3]);
    });

    it("handles boolean and null values in frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Edge Cases",
          published: true,
          featured: false,
          deprecated: null,
        },
        content: "# Content",
        filePath: "/pages/edge.md",
      };

      const result = serializePageData(page, "/edge");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.published).toBe(true);
      expect(data.frontmatter.featured).toBe(false);
      expect(data.frontmatter.deprecated).toBe(null);
    });

    it("handles numeric values in frontmatter", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Numbers",
          readTime: 5,
          rating: 4.5,
          views: 1000,
        },
        content: "# Content",
        filePath: "/pages/numbers.md",
      };

      const result = serializePageData(page, "/numbers");

      const jsonMatch = result.match(
        /^<script id="__TABI_DATA__" type="application\/json">(.*)<\/script>$/,
      );
      const escapedJson = jsonMatch![1];
      const json = escapedJson
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const data = JSON.parse(json);

      expect(data.frontmatter.readTime).toBe(5);
      expect(data.frontmatter.rating).toBe(4.5);
      expect(data.frontmatter.views).toBe(1000);
    });
  });
});

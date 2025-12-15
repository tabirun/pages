import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { z } from "zod";
import { parseFrontmatter } from "../frontmatter.ts";
import { FrontmatterError, LoaderError } from "../types.ts";

describe("parseFrontmatter", () => {
  describe("valid frontmatter", () => {
    it("parses frontmatter with all fields", () => {
      const raw = `---
title: Hello World
description: A test page
---
# Content here`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.frontmatter).toEqual({
        title: "Hello World",
        description: "A test page",
      });
      expect(result.content).toBe("# Content here");
    });

    it("parses frontmatter with only title", () => {
      const raw = `---
title: Just a Title
---
Content`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.frontmatter.title).toBe("Just a Title");
      expect(result.frontmatter.description).toBeUndefined();
      expect(result.content).toBe("Content");
    });

    it("passes through custom fields", () => {
      const raw = `---
title: Page
author: John Doe
tags:
  - typescript
  - deno
---
Content`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.frontmatter.title).toBe("Page");
      expect(result.frontmatter.author).toBe("John Doe");
      expect(result.frontmatter.tags).toEqual(["typescript", "deno"]);
    });

    it("handles CRLF line endings", () => {
      const raw = "---\r\ntitle: Windows\r\n---\r\nContent";

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.frontmatter.title).toBe("Windows");
      expect(result.content).toBe("Content");
    });
  });

  describe("missing frontmatter", () => {
    it("returns empty frontmatter when no frontmatter block", () => {
      const raw = "# Just content\n\nNo frontmatter here.";

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(raw);
    });

    it("returns empty frontmatter for empty string", () => {
      const result = parseFrontmatter("", "/test/page.md");

      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe("");
    });

    it("throws FrontmatterError when schema requires fields but no frontmatter", () => {
      const strictSchema = z.object({
        title: z.string(),
      });

      const raw = "# Just content, no frontmatter";

      try {
        parseFrontmatter(raw, "/test/page.md", strictSchema);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(FrontmatterError);
        expect((error as FrontmatterError).filePath).toBe("/test/page.md");
      }
    });
  });

  describe("empty frontmatter block", () => {
    it("handles empty frontmatter block", () => {
      const raw = `---

---
Content after empty frontmatter`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe("Content after empty frontmatter");
    });
  });

  describe("malformed YAML", () => {
    it("throws LoaderError for invalid YAML syntax", () => {
      const raw = `---
title: "unclosed quote
---
Content`;

      expect(() => parseFrontmatter(raw, "/test/page.md")).toThrow(LoaderError);
    });

    it("includes file path in error", () => {
      const raw = `---
: invalid
---
Content`;

      try {
        parseFrontmatter(raw, "/test/page.md");
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(LoaderError);
        expect((error as LoaderError).filePath).toBe("/test/page.md");
      }
    });
  });

  describe("non-object frontmatter", () => {
    it("throws LoaderError for string frontmatter", () => {
      const raw = `---
just a string
---
Content`;

      expect(() => parseFrontmatter(raw, "/test/page.md")).toThrow(LoaderError);
    });

    it("throws LoaderError for array frontmatter", () => {
      const raw = `---
- item1
- item2
---
Content`;

      expect(() => parseFrontmatter(raw, "/test/page.md")).toThrow(LoaderError);

      try {
        parseFrontmatter(raw, "/test/page.md");
      } catch (error) {
        expect((error as LoaderError).message).toBe(
          "Frontmatter must be an object",
        );
      }
    });

    it("throws LoaderError for number frontmatter", () => {
      const raw = `---
42
---
Content`;

      expect(() => parseFrontmatter(raw, "/test/page.md")).toThrow(LoaderError);
    });
  });

  describe("custom schema", () => {
    it("validates against custom schema", () => {
      const customSchema = z.object({
        title: z.string(),
        count: z.number(),
      });

      const raw = `---
title: Required Title
count: 42
---
Content`;

      const result = parseFrontmatter(raw, "/test/page.md", customSchema);

      expect(result.frontmatter).toEqual({
        title: "Required Title",
        count: 42,
      });
    });

    it("throws FrontmatterError when custom schema validation fails", () => {
      const customSchema = z.object({
        title: z.string(),
        count: z.number(),
      });

      const raw = `---
title: Missing Count
---
Content`;

      expect(() => parseFrontmatter(raw, "/test/page.md", customSchema))
        .toThrow(FrontmatterError);
    });

    it("includes validation errors in FrontmatterError", () => {
      const customSchema = z.object({
        title: z.string(),
        count: z.number(),
      });

      const raw = `---
title: Test
count: not-a-number
---
Content`;

      try {
        parseFrontmatter(raw, "/test/page.md", customSchema);
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error && error.message === "Should have thrown") {
          throw error;
        }
        expect(error).toBeInstanceOf(FrontmatterError);
        const fmError = error as FrontmatterError;
        expect(fmError.validationErrors.issues.length).toBeGreaterThan(0);
        expect(fmError.validationErrors.issues[0].path).toContain("count");
      }
    });
  });

  describe("content extraction", () => {
    it("preserves content after frontmatter", () => {
      const raw = `---
title: Test
---
Line 1
Line 2

Line 4`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.content).toBe("Line 1\nLine 2\n\nLine 4");
    });

    it("handles frontmatter with no trailing newline", () => {
      const raw = `---
title: Test
---
Content`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.content).toBe("Content");
    });

    it("handles content that looks like frontmatter delimiter", () => {
      const raw = `---
title: Test
---
Some content
---
This is not frontmatter`;

      const result = parseFrontmatter(raw, "/test/page.md");

      expect(result.content).toBe("Some content\n---\nThis is not frontmatter");
    });
  });
});

import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { generateSSREntry } from "../ssr-entry.ts";
import type { LayoutEntry, PageEntry } from "../../scanner/types.ts";

describe("generateSSREntry", () => {
  const preactDir = "/project/preact";

  describe("TSX pages", () => {
    const tsxPage: PageEntry = {
      filePath: "/project/pages/about.tsx",
      route: "/about",
      type: "tsx",
      layoutChain: [],
    };

    it("should return a string", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(typeof entry).toBe("string");
    });

    it("should import render from preact-render-to-string", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain(
        'import { render } from "preact-render-to-string"',
      );
    });

    it("should import context providers from preactDir", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain(
        'import { BasePathProvider, FrontmatterProvider } from "/project/preact/context.tsx"',
      );
      expect(entry).toContain(
        'import { MarkdownCacheProvider } from "/project/preact/markdown-cache.tsx"',
      );
    });

    it("should import Page component with frontmatter", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain(
        'import Page, { frontmatter as pageFrontmatter } from "/project/pages/about.tsx"',
      );
    });

    it("should not import Markdown component for TSX pages", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).not.toContain("import { Markdown }");
    });

    it("should generate App component", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain("function App()");
      expect(entry).toContain("<Page />");
    });

    it("should wrap in BasePathProvider with default empty basePath", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain('<BasePathProvider basePath="">');
    });

    it("should wrap in BasePathProvider with custom basePath", () => {
      const entry = generateSSREntry({
        page: tsxPage,
        layouts: [],
        preactDir,
        basePath: "/docs",
      });
      expect(entry).toContain('<BasePathProvider basePath="/docs">');
    });

    it("should wrap in MarkdownCacheProvider with empty initialData", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain("<MarkdownCacheProvider initialData={{}}>");
      expect(entry).toContain("</MarkdownCacheProvider>");
    });

    it("should wrap in FrontmatterProvider", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain(
        "<FrontmatterProvider frontmatter={pageFrontmatter ?? {}}>",
      );
      expect(entry).toContain("</FrontmatterProvider>");
    });

    it("should export html, pageType, and frontmatter", () => {
      const entry = generateSSREntry({ page: tsxPage, layouts: [], preactDir });
      expect(entry).toContain("export const html = render(<App />)");
      expect(entry).toContain('export const pageType = "tsx"');
      expect(entry).toContain(
        "export const frontmatter = pageFrontmatter ?? {}",
      );
    });

    describe("with layouts", () => {
      const layouts: LayoutEntry[] = [
        { filePath: "/project/pages/_layout.tsx", directory: "/project/pages" },
        {
          filePath: "/project/pages/blog/_layout.tsx",
          directory: "/project/pages/blog",
        },
      ];

      it("should import all layouts", () => {
        const entry = generateSSREntry({
          page: tsxPage,
          layouts,
          preactDir,
        });
        expect(entry).toContain(
          'import Layout0 from "/project/pages/_layout.tsx"',
        );
        expect(entry).toContain(
          'import Layout1 from "/project/pages/blog/_layout.tsx"',
        );
      });

      it("should wrap Page in layouts from root to innermost", () => {
        const entry = generateSSREntry({
          page: tsxPage,
          layouts,
          preactDir,
        });
        // Layout0 should be outermost
        expect(entry).toContain("<Layout0>");
        expect(entry).toContain("</Layout0>");
        // Layout1 should be inner
        expect(entry).toContain("<Layout1>");
        expect(entry).toContain("</Layout1>");

        // Check nesting order: Layout0 wraps Layout1 wraps Page
        const layout0Open = entry.indexOf("<Layout0>");
        const layout1Open = entry.indexOf("<Layout1>");
        const pageTag = entry.indexOf("<Page />");
        const layout1Close = entry.indexOf("</Layout1>");
        const layout0Close = entry.indexOf("</Layout0>");

        expect(layout0Open).toBeLessThan(layout1Open);
        expect(layout1Open).toBeLessThan(pageTag);
        expect(pageTag).toBeLessThan(layout1Close);
        expect(layout1Close).toBeLessThan(layout0Close);
      });
    });
  });

  describe("Markdown pages", () => {
    const mdPage: PageEntry = {
      filePath: "/project/pages/index.md",
      route: "/",
      type: "markdown",
      layoutChain: [],
    };

    it("should return a string", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(typeof entry).toBe("string");
    });

    it("should import render from preact-render-to-string", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain(
        'import { render } from "preact-render-to-string"',
      );
    });

    it("should import Markdown component", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain(
        'import { Markdown } from "/project/preact/markdown.tsx"',
      );
    });

    it("should read markdown content at bundle time", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain(
        'Deno.readTextFileSync("/project/pages/index.md")',
      );
    });

    it("should parse frontmatter from markdown", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain('if (markdownContent.startsWith("---"))');
      expect(entry).toContain("pageFrontmatter");
      expect(entry).toContain("markdownBody");
    });

    it("should use Markdown component with markdownBody", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain("<Markdown>{markdownBody}</Markdown>");
    });

    it("should export pageType as markdown", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain('export const pageType = "markdown"');
    });

    it("should export frontmatter with null coalescing", () => {
      const entry = generateSSREntry({ page: mdPage, layouts: [], preactDir });
      expect(entry).toContain(
        "export const frontmatter = pageFrontmatter ?? {}",
      );
    });

    describe("with layouts", () => {
      const layouts: LayoutEntry[] = [
        { filePath: "/project/pages/_layout.tsx", directory: "/project/pages" },
      ];

      it("should wrap Markdown in layouts", () => {
        const entry = generateSSREntry({
          page: mdPage,
          layouts,
          preactDir,
        });
        expect(entry).toContain("<Layout0>");
        expect(entry).toContain("</Layout0>");

        // Check Markdown is inside Layout
        const layoutOpen = entry.indexOf("<Layout0>");
        const markdownTag = entry.indexOf("<Markdown>");
        const layoutClose = entry.indexOf("</Layout0>");

        expect(layoutOpen).toBeLessThan(markdownTag);
        expect(markdownTag).toBeLessThan(layoutClose);
      });
    });
  });

  describe("path escaping", () => {
    it("should escape paths with special characters", () => {
      const page: PageEntry = {
        filePath: '/project/pages/test"file.tsx',
        route: "/test",
        type: "tsx",
        layoutChain: [],
      };
      const entry = generateSSREntry({ page, layouts: [], preactDir });
      // Double quotes should be escaped
      expect(entry).toContain('\\"');
    });

    it("should escape backslashes in paths", () => {
      const page: PageEntry = {
        filePath: "C:\\project\\pages\\test.tsx",
        route: "/test",
        type: "tsx",
        layoutChain: [],
      };
      const entry = generateSSREntry({ page, layouts: [], preactDir });
      // Backslashes should be escaped
      expect(entry).toContain("\\\\");
    });

    it("should escape Unicode Line Separator (U+2028)", () => {
      const page: PageEntry = {
        filePath: "/project/pages/test\u2028file.tsx",
        route: "/test",
        type: "tsx",
        layoutChain: [],
      };
      const entry = generateSSREntry({ page, layouts: [], preactDir });
      // Should NOT contain unescaped U+2028
      expect(entry).not.toContain("\u2028");
      // Should contain escaped version
      expect(entry).toContain("\\u2028");
    });

    it("should escape Unicode Paragraph Separator (U+2029)", () => {
      const page: PageEntry = {
        filePath: "/project/pages/test\u2029file.tsx",
        route: "/test",
        type: "tsx",
        layoutChain: [],
      };
      const entry = generateSSREntry({ page, layouts: [], preactDir });
      // Should NOT contain unescaped U+2029
      expect(entry).not.toContain("\u2029");
      // Should contain escaped version
      expect(entry).toContain("\\u2029");
    });

    it("should prevent code injection via Unicode line separators", () => {
      // Malicious path that attempts to break out of import statement
      const maliciousPath = '/pages/test\u2028"; import("evil"); //.tsx';
      const page: PageEntry = {
        filePath: maliciousPath,
        route: "/test",
        type: "tsx",
        layoutChain: [],
      };
      const entry = generateSSREntry({ page, layouts: [], preactDir });

      // The import statement should remain on one line (no unescaped line breaks)
      const importLines = entry.split("\n").filter((line) =>
        line.includes("import Page")
      );
      expect(importLines).toHaveLength(1);

      // Should not contain executable injection as a separate statement
      expect(entry).not.toMatch(/^import\("evil"\)/m);
    });
  });

  describe("provider nesting order", () => {
    const page: PageEntry = {
      filePath: "/project/pages/test.tsx",
      route: "/test",
      type: "tsx",
      layoutChain: [],
    };

    it("should nest providers in correct order: BasePath > MarkdownCache > Frontmatter > Layouts > Page", () => {
      const layouts: LayoutEntry[] = [
        { filePath: "/project/pages/_layout.tsx", directory: "/project/pages" },
      ];
      const entry = generateSSREntry({ page, layouts, preactDir });

      const basePathOpen = entry.indexOf("<BasePathProvider");
      const markdownCacheOpen = entry.indexOf("<MarkdownCacheProvider");
      const frontmatterOpen = entry.indexOf("<FrontmatterProvider");
      const layoutOpen = entry.indexOf("<Layout0>");
      const pageTag = entry.indexOf("<Page />");

      expect(basePathOpen).toBeLessThan(markdownCacheOpen);
      expect(markdownCacheOpen).toBeLessThan(frontmatterOpen);
      expect(frontmatterOpen).toBeLessThan(layoutOpen);
      expect(layoutOpen).toBeLessThan(pageTag);
    });
  });
});

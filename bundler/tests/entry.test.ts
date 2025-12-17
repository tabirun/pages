import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { generateClientEntry } from "../entry.ts";
import type {
  LoadedLayout,
  LoadedMarkdownPage,
  LoadedTsxPage,
} from "../../loaders/types.ts";

const PREACT_DIR = "/project/preact";

describe("generateClientEntry", () => {
  describe("TSX pages", () => {
    it("generates entry for TSX page without layouts", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Dashboard" },
        component: () => null,
        filePath: "/project/pages/dashboard.tsx",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Check imports - hydrate comes from our Preact re-export
      expect(result).toContain(
        `import { hydrate } from "${PREACT_DIR}/mod.ts";`,
      );
      expect(result).toContain(
        `import { BasePathProvider, FrontmatterProvider, MarkdownConfigProvider } from "${PREACT_DIR}/context.tsx";`,
      );
      expect(result).toContain(
        `import { MarkdownCacheProvider } from "${PREACT_DIR}/markdown-cache.tsx";`,
      );
      expect(result).toContain(
        'import Page from "/project/pages/dashboard.tsx";',
      );

      // Should not import Markdown for TSX pages
      expect(result).not.toContain("Markdown }");
      expect(result).not.toContain("/markdown.tsx");

      // Check data reading
      expect(result).toContain(
        'const dataEl = document.getElementById("__TABI_DATA__");',
      );
      expect(result).toContain(
        'const data = JSON.parse(dataEl?.textContent ?? "{}");',
      );

      // Check App component structure
      expect(result).toContain("function App()");
      expect(result).toContain(
        '<BasePathProvider basePath={data.basePath ?? ""}>',
      );
      expect(result).toContain(
        "<MarkdownCacheProvider initialData={data.markdownCache}>",
      );
      expect(result).toContain(
        "<FrontmatterProvider frontmatter={data.frontmatter}>",
      );
      expect(result).toContain("<Page />");
      expect(result).toContain("</FrontmatterProvider>");
      expect(result).toContain("</MarkdownCacheProvider>");
      expect(result).toContain("</BasePathProvider>");

      // Check nesting order: BasePathProvider > MarkdownConfigProvider > MarkdownCacheProvider > FrontmatterProvider
      const basePathOpen = result.indexOf("<BasePathProvider");
      const configOpen = result.indexOf("<MarkdownConfigProvider");
      const cacheOpen = result.indexOf("<MarkdownCacheProvider");
      const frontmatterOpen = result.indexOf("<FrontmatterProvider");
      const frontmatterClose = result.indexOf("</FrontmatterProvider>");
      const cacheClose = result.indexOf("</MarkdownCacheProvider>");
      const configClose = result.indexOf("</MarkdownConfigProvider>");
      const basePathClose = result.indexOf("</BasePathProvider>");

      expect(basePathOpen).toBeLessThan(configOpen);
      expect(configOpen).toBeLessThan(cacheOpen);
      expect(cacheOpen).toBeLessThan(frontmatterOpen);
      expect(frontmatterClose).toBeLessThan(cacheClose);
      expect(cacheClose).toBeLessThan(configClose);
      expect(configClose).toBeLessThan(basePathClose);

      // Check hydration
      expect(result).toContain(
        'hydrate(<App />, document.getElementById("__tabi__")!);',
      );
    });

    it("generates entry for TSX page with single layout", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "About" },
        component: () => null,
        filePath: "/project/pages/about.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Check layout import
      expect(result).toContain(
        'import Layout0 from "/project/pages/_layout.tsx";',
      );

      // Check nested structure
      expect(result).toContain("<Layout0>");
      expect(result).toContain("<Page />");
      expect(result).toContain("</Layout0>");
    });

    it("generates entry for TSX page with multiple nested layouts", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Blog Post" },
        component: () => null,
        filePath: "/project/pages/blog/posts/article.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
        {
          component: () => null,
          filePath: "/project/pages/blog/_layout.tsx",
          directory: "/project/pages/blog",
        },
        {
          component: () => null,
          filePath: "/project/pages/blog/posts/_layout.tsx",
          directory: "/project/pages/blog/posts",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Check all layout imports
      expect(result).toContain(
        'import Layout0 from "/project/pages/_layout.tsx";',
      );
      expect(result).toContain(
        'import Layout1 from "/project/pages/blog/_layout.tsx";',
      );
      expect(result).toContain(
        'import Layout2 from "/project/pages/blog/posts/_layout.tsx";',
      );

      // Check nesting order (root wraps inner)
      const layout0Open = result.indexOf("<Layout0>");
      const layout1Open = result.indexOf("<Layout1>");
      const layout2Open = result.indexOf("<Layout2>");
      const pageTag = result.indexOf("<Page />");
      const layout2Close = result.indexOf("</Layout2>");
      const layout1Close = result.indexOf("</Layout1>");
      const layout0Close = result.indexOf("</Layout0>");

      expect(layout0Open).toBeLessThan(layout1Open);
      expect(layout1Open).toBeLessThan(layout2Open);
      expect(layout2Open).toBeLessThan(pageTag);
      expect(pageTag).toBeLessThan(layout2Close);
      expect(layout2Close).toBeLessThan(layout1Close);
      expect(layout1Close).toBeLessThan(layout0Close);
    });
  });

  describe("markdown pages", () => {
    it("generates entry for markdown page without layouts", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Welcome" },
        content: "# Hello World",
        filePath: "/project/pages/index.md",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Check imports - should include Markdown and MarkdownCacheProvider
      expect(result).toContain(
        `import { hydrate } from "${PREACT_DIR}/mod.ts";`,
      );
      expect(result).toContain(
        `import { BasePathProvider, FrontmatterProvider, MarkdownConfigProvider } from "${PREACT_DIR}/context.tsx";`,
      );
      expect(result).toContain(
        `import { MarkdownCacheProvider } from "${PREACT_DIR}/markdown-cache.tsx";`,
      );
      expect(result).toContain(
        `import { Markdown } from "${PREACT_DIR}/markdown.tsx";`,
      );

      // Should not import Page component
      expect(result).not.toContain("import Page from");

      // Check App component uses Markdown with cache provider
      expect(result).toContain(
        '<BasePathProvider basePath={data.basePath ?? ""}>',
      );
      expect(result).toContain(
        "<MarkdownCacheProvider initialData={data.markdownCache}>",
      );
      expect(result).toContain("<Markdown />");
      expect(result).not.toContain("<Page />");
      expect(result).toContain("</MarkdownCacheProvider>");
      expect(result).toContain("</BasePathProvider>");

      // Check hydration
      expect(result).toContain(
        'hydrate(<App />, document.getElementById("__tabi__")!);',
      );
    });

    it("generates entry for markdown page with single layout", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Docs" },
        content: "# Documentation",
        filePath: "/project/pages/docs/intro.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Check layout wraps Markdown
      expect(result).toContain("<Layout0>");
      expect(result).toContain("<Markdown />");
      expect(result).toContain("</Layout0>");
    });

    it("generates entry for markdown page with multiple nested layouts", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "API Reference" },
        content: "# API",
        filePath: "/project/pages/docs/api/client.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
        {
          component: () => null,
          filePath: "/project/pages/docs/_layout.tsx",
          directory: "/project/pages/docs",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Check nesting
      const layout0Open = result.indexOf("<Layout0>");
      const layout1Open = result.indexOf("<Layout1>");
      const markdown = result.indexOf("<Markdown />");
      const layout1Close = result.indexOf("</Layout1>");
      const layout0Close = result.indexOf("</Layout0>");

      expect(layout0Open).toBeLessThan(layout1Open);
      expect(layout1Open).toBeLessThan(markdown);
      expect(markdown).toBeLessThan(layout1Close);
      expect(layout1Close).toBeLessThan(layout0Close);
    });
  });

  describe("output format", () => {
    it("generates valid TypeScript/JSX syntax", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test" },
        component: () => null,
        filePath: "/project/pages/test.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Check proper JSX structure
      expect(result).toContain("function App() {");
      expect(result).toContain("  return (");
      expect(result).toContain("  );");
      expect(result).toContain("}");

      // Check opening tags have matching closing tags
      expect(result).toContain("<Layout0>");
      expect(result).toContain("</Layout0>");
      expect(result).toContain("<MarkdownCacheProvider");
      expect(result).toContain("</MarkdownCacheProvider>");
      expect(result).toContain("<FrontmatterProvider");
      expect(result).toContain("</FrontmatterProvider>");

      // Check self-closing tags are present
      expect(result).toContain("<Page />");
    });

    it("uses absolute paths for local imports", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: "/project/pages/page.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // All local imports should use absolute paths
      expect(result).toContain('import Page from "/project/pages/page.tsx"');
      expect(result).toContain(
        'import Layout0 from "/project/pages/_layout.tsx"',
      );
      expect(result).toContain(
        `import { BasePathProvider, FrontmatterProvider, MarkdownConfigProvider } from "${PREACT_DIR}/context.tsx"`,
      );
      expect(result).toContain(
        `import { MarkdownCacheProvider } from "${PREACT_DIR}/markdown-cache.tsx"`,
      );
    });

    it("ends with newline", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {},
        content: "",
        filePath: "/project/pages/index.md",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      expect(result.endsWith("\n")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles page with empty frontmatter", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: "/project/pages/empty.tsx",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Should still generate valid code
      expect(result).toContain("function App()");
      expect(result).toContain(
        "<FrontmatterProvider frontmatter={data.frontmatter}>",
      );
    });

    it("handles paths with special characters", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Special" },
        component: () => null,
        filePath: "/project/pages/docs/api-reference.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/docs/_layout.tsx",
          directory: "/project/pages/docs",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      expect(result).toContain("api-reference.tsx");
    });

    it("handles deeply nested directory structure", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Deep" },
        content: "# Deep content",
        filePath: "/project/pages/a/b/c/d/e/page.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: "/project/pages/_layout.tsx",
          directory: "/project/pages",
        },
        {
          component: () => null,
          filePath: "/project/pages/a/_layout.tsx",
          directory: "/project/pages/a",
        },
        {
          component: () => null,
          filePath: "/project/pages/a/b/_layout.tsx",
          directory: "/project/pages/a/b",
        },
        {
          component: () => null,
          filePath: "/project/pages/a/b/c/_layout.tsx",
          directory: "/project/pages/a/b/c",
        },
        {
          component: () => null,
          filePath: "/project/pages/a/b/c/d/_layout.tsx",
          directory: "/project/pages/a/b/c/d",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Should have all 5 layout imports
      expect(result).toContain("Layout0");
      expect(result).toContain("Layout1");
      expect(result).toContain("Layout2");
      expect(result).toContain("Layout3");
      expect(result).toContain("Layout4");

      // Check proper nesting depth
      expect(result).toContain("<Layout4>");
      expect(result).toContain("</Layout4>");
    });

    it("handles root index page", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Home" },
        content: "# Welcome",
        filePath: "/project/pages/index.md",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      expect(result).toContain(
        `import { BasePathProvider, FrontmatterProvider, MarkdownConfigProvider } from "${PREACT_DIR}/context.tsx";`,
      );
      expect(result).toContain(
        `import { Markdown } from "${PREACT_DIR}/markdown.tsx";`,
      );
      expect(result).toContain("<Markdown />");
    });
  });

  describe("security - path escaping", () => {
    it("escapes double quotes in file paths", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: '/project/pages/test".tsx',
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Double quote should be escaped, not break out of string
      expect(result).toContain('test\\"');
      expect(result).not.toContain('test".tsx";');
    });

    it("escapes backslashes in file paths", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: "/project/pages/test\\.tsx",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Backslash should be escaped
      expect(result).toContain("test\\\\");
    });

    it("escapes newlines in file paths", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: "/project/pages/test\n.tsx",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Newline should be escaped, not break the import statement
      expect(result).toContain("test\\n");
      expect(result).not.toContain("test\n");
    });

    it("escapes carriage returns in file paths", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: "/project/pages/test\r.tsx",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // CR should be escaped
      expect(result).toContain("test\\r");
    });

    it("escapes tabs in file paths", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: "/project/pages/test\t.tsx",
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // Tab should be escaped
      expect(result).toContain("test\\t");
    });

    it("escapes dangerous characters in layout paths", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {},
        content: "",
        filePath: "/project/pages/index.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: () => null,
          filePath: '/project/pages/_layout"injected.tsx',
          directory: "/project/pages",
        },
      ];

      const result = generateClientEntry(page, layouts, PREACT_DIR);

      // Quote in layout path should be escaped
      expect(result).toContain('_layout\\"injected');
    });

    it("prevents code injection via quote breakout", () => {
      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: () => null,
        filePath: '/project/pages/test"; alert("xss");//.tsx',
      };

      const result = generateClientEntry(page, [], PREACT_DIR);

      // The alert should be part of the escaped string, not executable code
      expect(result).toContain('\\"');
      // Should not have unescaped quotes that would allow code injection
      const importLine = result
        .split("\n")
        .find((line) => line.includes("import Page"));
      expect(importLine).toBeDefined();
      // Count quotes - should be exactly 2 (opening and closing the import path)
      const quoteCount = (importLine!.match(/(?<!\\)"/g) || []).length;
      expect(quoteCount).toBe(2);
    });
  });
});

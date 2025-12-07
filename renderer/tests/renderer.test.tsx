import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type { ComponentType } from "preact";
import { renderPage } from "../renderer.tsx";
import { RenderError } from "../types.ts";
import type { DocumentProps } from "../types.ts";
import type {
  LayoutProps,
  LoadedLayout,
  LoadedMarkdownPage,
  LoadedTsxPage,
} from "../../loaders/mod.ts";
import { Head, useFrontmatter } from "../../preact/mod.ts";

describe("renderPage", () => {
  describe("TSX pages with no layouts", () => {
    it("should render TSX page with no layouts", async () => {
      function ArticlePage() {
        return (
          <article>
            <h1>Building Modern Web Applications</h1>
            <p>A comprehensive guide to building web apps with Deno.</p>
          </article>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Building Modern Web Applications",
          description: "A comprehensive guide",
        },
        component: ArticlePage,
        filePath: "/pages/article.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/article.js",
        route: "/article",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("<html");
      expect(result.html).toContain(
        "<h1>Building Modern Web Applications</h1>",
      );
      expect(result.html).toContain(
        "<p>A comprehensive guide to building web apps with Deno.</p>",
      );
    });

    it("should wrap content in __tabi__ div", async () => {
      function SimplePage() {
        return <div>Content</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Simple Page" },
        component: SimplePage,
        filePath: "/pages/simple.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/simple.js",
        route: "/simple",
      });

      expect(result.html).toContain('<div id="__tabi__">');
      expect(result.html).toContain("<div>Content</div>");
    });

    it("should include data script with serialized frontmatter", async () => {
      function BlogPost() {
        return <article>Post content</article>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Understanding TypeScript",
          author: "Jane Smith",
          publishedAt: "2024-05-15",
        },
        component: BlogPost,
        filePath: "/pages/blog/typescript.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/blog/typescript.js",
        route: "/blog/typescript",
      });

      expect(result.html).toContain('<script id="__TABI_DATA__"');
      expect(result.html).toContain('type="application/json"');
      expect(result.html).toContain("&quot;frontmatter&quot;");
      expect(result.html).toContain("&quot;title&quot;");
      expect(result.html).toContain("&quot;Understanding TypeScript&quot;");
      expect(result.html).toContain("&quot;author&quot;");
      expect(result.html).toContain("&quot;Jane Smith&quot;");
      expect(result.html).toContain("&quot;route&quot;");
      expect(result.html).toContain("&quot;/blog/typescript&quot;");
      expect(result.html).toContain("&quot;pageType&quot;");
      expect(result.html).toContain("&quot;tsx&quot;");
    });

    it("should include bundle script with correct path", async () => {
      function HomePage() {
        return <main>Home</main>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Home" },
        component: HomePage,
        filePath: "/pages/index.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/index-a1b2c3d4.js",
        route: "/",
      });

      expect(result.html).toContain('<script type="module"');
      expect(result.html).toContain('src="/_tabi/index-a1b2c3d4.js"');
    });
  });

  describe("TSX pages with layouts", () => {
    it("should render TSX page with single layout", async () => {
      function PageContent() {
        return (
          <article>
            <h2>Page Content</h2>
          </article>
        );
      }

      function RootLayout({ children }: LayoutProps) {
        return (
          <html>
            <head>
              <title>Site</title>
            </head>
            <body>
              <header>
                <nav>Navigation</nav>
              </header>
              <main>{children}</main>
              <footer>Footer</footer>
            </body>
          </html>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test Page" },
        component: PageContent,
        filePath: "/pages/test.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: RootLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const result = await renderPage({
        page,
        layouts,
        clientBundlePath: "/_tabi/test.js",
        route: "/test",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("<nav>Navigation</nav>");
      expect(result.html).toContain("<main>");
      expect(result.html).toContain("<h2>Page Content</h2>");
      expect(result.html).toContain("<footer>Footer</footer>");
    });

    it("should render TSX page with multiple layouts", async () => {
      function PageContent() {
        return <article data-component="page">Article</article>;
      }

      function RootLayout({ children }: LayoutProps) {
        return <html data-layout="root">{children}</html>;
      }

      function BlogLayout({ children }: LayoutProps) {
        return <div data-layout="blog">{children}</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Blog Post" },
        component: PageContent,
        filePath: "/pages/blog/post.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: RootLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
        {
          component: BlogLayout,
          filePath: "/pages/blog/_layout.tsx",
          directory: "/pages/blog",
        },
      ];

      const result = await renderPage({
        page,
        layouts,
        clientBundlePath: "/_tabi/blog/post.js",
        route: "/blog/post",
      });

      const rootIndex = result.html.indexOf('data-layout="root"');
      const blogIndex = result.html.indexOf('data-layout="blog"');
      const pageIndex = result.html.indexOf('data-component="page"');

      expect(rootIndex).toBeGreaterThan(-1);
      expect(blogIndex).toBeGreaterThan(-1);
      expect(pageIndex).toBeGreaterThan(-1);
      expect(rootIndex).toBeLessThan(blogIndex);
      expect(blogIndex).toBeLessThan(pageIndex);
    });
  });

  describe("markdown pages", () => {
    it("should render markdown page with no layouts", async () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Getting Started with Deno",
        },
        content:
          "# Getting Started\n\nDeno is a secure runtime for JavaScript.",
        filePath: "/pages/getting-started.md",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/getting-started.js",
        route: "/getting-started",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("<h1>Getting Started</h1>");
      expect(result.html).toContain(
        "<p>Deno is a secure runtime for JavaScript.</p>",
      );
      expect(result.html).not.toContain("<tabi-markdown>");
    });

    it("should render markdown page with layouts", async () => {
      function DocumentLayout({ children }: LayoutProps) {
        const { title } = useFrontmatter();
        return (
          <html>
            <head>
              <title>{title}</title>
            </head>
            <body>
              <main>{children}</main>
            </body>
          </html>
        );
      }

      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Web Performance Tips",
        },
        content:
          "# Performance\n\n## Tips\n\n- Optimize images\n- Minimize JavaScript",
        filePath: "/pages/performance.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: DocumentLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const result = await renderPage({
        page,
        layouts,
        clientBundlePath: "/_tabi/performance.js",
        route: "/performance",
      });

      expect(result.html).toContain("<title>Web Performance Tips</title>");
      expect(result.html).toContain("<h1>Performance</h1>");
      expect(result.html).toContain("<h2>Tips</h2>");
      expect(result.html).toContain("<li>Optimize images</li>");
      expect(result.html).toContain("<li>Minimize JavaScript</li>");
    });

    it("should process markdown with code blocks", async () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Code Example" },
        content:
          "# Example\n\n```typescript\nconst greeting = 'Hello, Deno!';\nconsole.log(greeting);\n```",
        filePath: "/pages/example.md",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/example.js",
        route: "/example",
      });

      expect(result.html).toContain("<h1>Example</h1>");
      expect(result.html).toContain("<pre");
      expect(result.html).toContain("<code");
      expect(result.html).toContain("const</span>");
      expect(result.html).toContain("greeting</span>");
      expect(result.html).toContain("'Hello, Deno!'");
    });

    it("should include markdown pageType in data script", async () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Markdown Page" },
        content: "# Content",
        filePath: "/pages/markdown.md",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/markdown.js",
        route: "/markdown",
      });

      expect(result.html).toContain("&quot;pageType&quot;");
      expect(result.html).toContain("&quot;markdown&quot;");
    });
  });

  describe("head content injection", () => {
    it("should inject head content from Head components", async () => {
      function PageWithHead() {
        return (
          <>
            <Head>
              <title>Custom Page Title</title>
              <meta name="description" content="Custom description" />
              <link rel="canonical" href="https://example.com/page" />
            </Head>
            <article>
              <h1>Article Content</h1>
            </article>
          </>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Page" },
        component: PageWithHead,
        filePath: "/pages/page.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/page.js",
        route: "/page",
      });

      const headIndex = result.html.indexOf("</head>");
      const titleIndex = result.html.indexOf(
        "<title>Custom Page Title</title>",
      );
      const metaIndex = result.html.indexOf(
        '<meta name="description" content="Custom description"',
      );
      const linkIndex = result.html.indexOf(
        '<link rel="canonical" href="https://example.com/page"',
      );

      expect(headIndex).toBeGreaterThan(-1);
      expect(titleIndex).toBeGreaterThan(-1);
      expect(metaIndex).toBeGreaterThan(-1);
      expect(linkIndex).toBeGreaterThan(-1);
      expect(titleIndex).toBeLessThan(headIndex);
      expect(metaIndex).toBeLessThan(headIndex);
      expect(linkIndex).toBeLessThan(headIndex);
    });

    it("should inject head content from multiple Head components", async () => {
      function PageWithMultipleHeads() {
        return (
          <>
            <Head>
              <title>Page Title</title>
            </Head>
            <article>
              <Head>
                <meta name="author" content="Jane Smith" />
              </Head>
              <h1>Content</h1>
            </article>
            <Head>
              <link rel="stylesheet" href="/styles.css" />
            </Head>
          </>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Multi Head" },
        component: PageWithMultipleHeads,
        filePath: "/pages/multi.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/multi.js",
        route: "/multi",
      });

      expect(result.html).toContain("<title>Page Title</title>");
      expect(result.html).toContain('<meta name="author" content="Jane Smith"');
      expect(result.html).toContain(
        '<link rel="stylesheet" href="/styles.css"',
      );
    });

    it("should inject head content from layout components", async () => {
      function PageContent() {
        return <article>Content</article>;
      }

      function LayoutWithHead({ children }: LayoutProps) {
        const { title, description } = useFrontmatter();
        return (
          <html>
            <head>
              <Head>
                <title>{title}</title>
                <meta name="description" content={description as string} />
              </Head>
            </head>
            <body>{children}</body>
          </html>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "SEO Optimized Page",
          description: "A page with proper meta tags",
        },
        component: PageContent,
        filePath: "/pages/seo.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: LayoutWithHead,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const result = await renderPage({
        page,
        layouts,
        clientBundlePath: "/_tabi/seo.js",
        route: "/seo",
      });

      expect(result.html).toContain("<title>SEO Optimized Page</title>");
      expect(result.html).toContain(
        'content="A page with proper meta tags"',
      );
    });
  });

  describe("custom document", () => {
    it("should use custom document when provided", async () => {
      function CustomDocument({ head, children }: DocumentProps) {
        return (
          <html lang="en" className="dark">
            <head>
              <meta charSet="UTF-8" />
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              {head}
            </head>
            <body className="antialiased bg-gray-900">
              {children}
            </body>
          </html>
        );
      }

      function SimplePage() {
        return <main>Page content</main>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Custom Doc Page" },
        component: SimplePage,
        filePath: "/pages/custom.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/custom.js",
        route: "/custom",
        document: CustomDocument,
      });

      expect(result.html).toContain('lang="en"');
      expect(result.html).toContain('class="dark"');
      expect(result.html).toContain(
        '<link rel="preconnect" href="https://fonts.googleapis.com"',
      );
      expect(result.html).toContain('class="antialiased bg-gray-900"');
    });

    it("should inject head content into custom document", async () => {
      function CustomDocument({ head, children }: DocumentProps) {
        return (
          <html>
            <head>
              <meta name="custom" content="document" />
              {head}
            </head>
            <body>{children}</body>
          </html>
        );
      }

      function PageWithHead() {
        return (
          <>
            <Head>
              <title>Custom Title</title>
            </Head>
            <div>Content</div>
          </>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Page" },
        component: PageWithHead,
        filePath: "/pages/page.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/page.js",
        route: "/page",
        document: CustomDocument,
      });

      expect(result.html).toContain('<meta name="custom" content="document"');
      expect(result.html).toContain("<title>Custom Title</title>");
    });

    it("should handle custom document without head closing tag", async () => {
      // This is an unusual edge case - a document that doesn't have a proper </head>
      // The renderer gracefully falls back to not injecting head content
      function MalformedDocument({ children }: DocumentProps) {
        return (
          <div>
            <main>{children}</main>
          </div>
        );
      }

      function PageWithHead() {
        return (
          <>
            <Head>
              <title>Should Not Appear</title>
            </Head>
            <div>Content</div>
          </>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test" },
        component: PageWithHead,
        filePath: "/pages/test.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/test.js",
        route: "/test",
        document: MalformedDocument,
      });

      // Should still render the document (even if malformed)
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("<div>Content</div>");
      // The __tabi__ div and scripts should still be present
      expect(result.html).toContain('<div id="__tabi__">');
      expect(result.html).toContain('<script id="__TABI_DATA__"');
    });
  });

  describe("complete document structure", () => {
    it("should return complete HTML with DOCTYPE", async () => {
      function SimplePage() {
        return <div>Content</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test" },
        component: SimplePage,
        filePath: "/pages/test.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/test.js",
        route: "/test",
      });

      expect(result.html.startsWith("<!DOCTYPE html>")).toBe(true);
      expect(result.html).toContain("<html");
      expect(result.html).toContain("<head>");
      expect(result.html).toContain("</head>");
      expect(result.html).toContain("<body>");
      expect(result.html).toContain("</body>");
      expect(result.html).toContain("</html>");
    });

    it("should include default meta tags", async () => {
      function HomePage() {
        return <main>Home</main>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Home" },
        component: HomePage,
        filePath: "/pages/index.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/index.js",
        route: "/",
      });

      expect(result.html).toContain('<meta charset="UTF-8"');
      expect(result.html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"',
      );
    });

    it("should place hydration root before scripts", async () => {
      function ContentPage() {
        return <div data-test="content">Content</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Content" },
        component: ContentPage,
        filePath: "/pages/content.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/content.js",
        route: "/content",
      });

      const tabiDivIndex = result.html.indexOf('<div id="__tabi__">');
      const dataScriptIndex = result.html.indexOf('id="__TABI_DATA__"');
      const bundleScriptIndex = result.html.indexOf('type="module"');

      expect(tabiDivIndex).toBeGreaterThan(-1);
      expect(dataScriptIndex).toBeGreaterThan(-1);
      expect(bundleScriptIndex).toBeGreaterThan(-1);
      expect(tabiDivIndex).toBeLessThan(dataScriptIndex);
      expect(dataScriptIndex).toBeLessThan(bundleScriptIndex);
    });
  });

  describe("error handling", () => {
    it("should throw RenderError when rendering fails", async () => {
      function BrokenPage(): never {
        throw new Error("Component render error");
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Broken" },
        component: BrokenPage as ComponentType,
        filePath: "/pages/broken.tsx",
      };

      await expect(
        renderPage({
          page,
          layouts: [],
          clientBundlePath: "/_tabi/broken.js",
          route: "/broken",
        }),
      ).rejects.toThrow(RenderError);
    });

    it("should include route in RenderError", async () => {
      function FailingPage(): never {
        throw new Error("Render failure");
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Failing" },
        component: FailingPage as ComponentType,
        filePath: "/pages/fail.tsx",
      };

      try {
        await renderPage({
          page,
          layouts: [],
          clientBundlePath: "/_tabi/fail.js",
          route: "/fail/route",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(RenderError);
        expect((error as RenderError).route).toBe("/fail/route");
      }
    });

    it("should include error message in RenderError", async () => {
      function ErrorPage(): never {
        throw new Error("Specific error message");
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Error" },
        component: ErrorPage as ComponentType,
        filePath: "/pages/error.tsx",
      };

      try {
        await renderPage({
          page,
          layouts: [],
          clientBundlePath: "/_tabi/error.js",
          route: "/error",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(RenderError);
        expect((error as RenderError).message).toContain(
          "Specific error message",
        );
        expect((error as RenderError).message).toContain(
          "Failed to render page",
        );
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty frontmatter", async () => {
      function SimplePage() {
        return <div>Content</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: SimplePage,
        filePath: "/pages/simple.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/simple.js",
        route: "/simple",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("<div>Content</div>");
      expect(result.html).toContain("&quot;frontmatter&quot;:{}");
    });

    it("should handle markdown with empty content", async () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Empty" },
        content: "",
        filePath: "/pages/empty.md",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/empty.js",
        route: "/empty",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
    });

    it("should handle special characters in frontmatter", async () => {
      function TestPage() {
        return <div>Test</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: 'Title with "quotes" & <tags>',
          description: "Line 1\nLine 2",
        },
        component: TestPage,
        filePath: "/pages/special.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/special.js",
        route: "/special",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
      // HTML escaping should prevent XSS
      expect(result.html).toContain("&quot;");
      expect(result.html).toContain("&lt;");
    });

    it("should handle page component returning null", async () => {
      function EmptyPage() {
        return null;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Empty" },
        component: EmptyPage,
        filePath: "/pages/empty.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/empty.js",
        route: "/empty",
      });

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain('<div id="__tabi__">');
    });

    it("should handle route with special characters", async () => {
      function TestPage() {
        return <div>Test</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test" },
        component: TestPage,
        filePath: "/pages/test.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/test.js",
        route: "/blog/2024-12-07/hello-world",
      });

      expect(result.html).toContain(
        "&quot;route&quot;:&quot;/blog/2024-12-07/hello-world&quot;",
      );
    });

    it("should handle bundle path with hash", async () => {
      function TestPage() {
        return <div>Test</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test" },
        component: TestPage,
        filePath: "/pages/test.tsx",
      };

      const result = await renderPage({
        page,
        layouts: [],
        clientBundlePath: "/_tabi/test-abc123def456.js",
        route: "/test",
      });

      expect(result.html).toContain('src="/_tabi/test-abc123def456.js"');
    });
  });
});

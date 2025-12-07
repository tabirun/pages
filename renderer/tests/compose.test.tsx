import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import type { ComponentType } from "preact";
import { composeTree } from "../compose.tsx";
import type {
  LoadedLayout,
  LoadedMarkdownPage,
  LoadedTsxPage,
} from "../../loaders/types.ts";
import { useFrontmatter } from "../../preact/context.tsx";
import type { LayoutProps } from "../../loaders/types.ts";

describe("composeTree", () => {
  describe("TSX pages with no layouts", () => {
    it("should compose TSX page with no layouts", () => {
      function BlogPost() {
        return (
          <article>
            <h1>Building a Static Site Generator</h1>
            <p>A comprehensive guide to creating SSGs with Deno.</p>
          </article>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Building a Static Site Generator",
          description: "A comprehensive guide",
        },
        component: BlogPost,
        filePath: "/pages/blog/ssg.tsx",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      expect(html).toContain("<article>");
      expect(html).toContain("<h1>Building a Static Site Generator</h1>");
      expect(html).toContain(
        "<p>A comprehensive guide to creating SSGs with Deno.</p>",
      );
    });

    it("should wrap TSX page in FrontmatterProvider", () => {
      function PageWithFrontmatter() {
        const { title, description } = useFrontmatter();
        return (
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Deno Best Practices",
          description: "Learn how to write better Deno applications",
        },
        component: PageWithFrontmatter,
        filePath: "/pages/deno-practices.tsx",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      expect(html).toContain("<h1>Deno Best Practices</h1>");
      expect(html).toContain(
        "<p>Learn how to write better Deno applications</p>",
      );
    });

    it("should provide custom frontmatter fields to TSX page", () => {
      function PageWithCustomFields() {
        const frontmatter = useFrontmatter();
        return (
          <article>
            <h1>{frontmatter.title}</h1>
            <p>By {frontmatter.author as string}</p>
            <time>{frontmatter.publishedAt as string}</time>
            <div>Tags: {(frontmatter.tags as string[]).join(", ")}</div>
          </article>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "TypeScript Advanced Patterns",
          author: "Jane Smith",
          publishedAt: "2024-03-15",
          tags: ["typescript", "patterns", "advanced"],
        },
        component: PageWithCustomFields,
        filePath: "/pages/typescript-patterns.tsx",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      expect(html).toContain("<h1>TypeScript Advanced Patterns</h1>");
      expect(html).toContain("<p>By Jane Smith</p>");
      expect(html).toContain("<time>2024-03-15</time>");
      expect(html).toContain("<div>Tags: typescript, patterns, advanced</div>");
    });
  });

  describe("TSX pages with single layout", () => {
    it("should compose TSX page with single layout", () => {
      function BasePage() {
        return (
          <article>
            <h2>Page Content</h2>
          </article>
        );
      }

      function BaseLayout({ children }: LayoutProps) {
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
        component: BasePage,
        filePath: "/pages/test.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: BaseLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      // Verify layout wraps page
      expect(html).toContain("<html>");
      expect(html).toContain("<nav>Navigation</nav>");
      expect(html).toContain("<main>");
      expect(html).toContain("<h2>Page Content</h2>");
      expect(html).toContain("</main>");
      expect(html).toContain("<footer>Footer</footer>");
    });

    it("should allow layout to access frontmatter", () => {
      function PageContent() {
        return <p>Article content goes here.</p>;
      }

      function DocumentLayout({ children }: LayoutProps) {
        const { title, description } = useFrontmatter();
        return (
          <html>
            <head>
              <title>{title}</title>
              <meta name="description" content={description as string} />
            </head>
            <body>{children}</body>
          </html>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Understanding Async Programming",
          description: "A deep dive into asynchronous JavaScript and Promises",
        },
        component: PageContent,
        filePath: "/pages/async.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: DocumentLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      expect(html).toContain("<title>Understanding Async Programming</title>");
      expect(html).toContain(
        'content="A deep dive into asynchronous JavaScript and Promises"',
      );
      expect(html).toContain("<p>Article content goes here.</p>");
    });
  });

  describe("TSX pages with multiple layouts", () => {
    it("should nest layouts in correct order from root to innermost", () => {
      function PageContent() {
        return <article data-component="page">Page</article>;
      }

      function RootLayout({ children }: LayoutProps) {
        return <html data-layout="root">{children}</html>;
      }

      function BlogLayout({ children }: LayoutProps) {
        return <div data-layout="blog">{children}</div>;
      }

      function ArticleLayout({ children }: LayoutProps) {
        return <section data-layout="article">{children}</section>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Test Article" },
        component: PageContent,
        filePath: "/pages/blog/articles/test.tsx",
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
        {
          component: ArticleLayout,
          filePath: "/pages/blog/articles/_layout.tsx",
          directory: "/pages/blog/articles",
        },
      ];

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      // Verify nesting order: root > blog > article > page
      const rootIndex = html.indexOf('data-layout="root"');
      const blogIndex = html.indexOf('data-layout="blog"');
      const articleIndex = html.indexOf('data-layout="article"');
      const pageIndex = html.indexOf('data-component="page"');

      expect(rootIndex).toBeGreaterThan(-1);
      expect(blogIndex).toBeGreaterThan(-1);
      expect(articleIndex).toBeGreaterThan(-1);
      expect(pageIndex).toBeGreaterThan(-1);

      // Verify correct nesting order
      expect(rootIndex).toBeLessThan(blogIndex);
      expect(blogIndex).toBeLessThan(articleIndex);
      expect(articleIndex).toBeLessThan(pageIndex);
    });

    it("should allow all layouts to access same frontmatter", () => {
      function PageContent() {
        const { title } = useFrontmatter();
        return <h1>{title}</h1>;
      }

      function RootLayout({ children }: LayoutProps) {
        const { title } = useFrontmatter();
        return (
          <html>
            <head>
              <title>{title} - My Site</title>
            </head>
            <body>{children}</body>
          </html>
        );
      }

      function BlogLayout({ children }: LayoutProps) {
        const { author } = useFrontmatter();
        return (
          <div>
            <p data-author={author as string}>By {author as string}</p>
            {children}
          </div>
        );
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {
          title: "Web Performance Optimization",
          author: "Jane Smith",
        },
        component: PageContent,
        filePath: "/pages/blog/performance.tsx",
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

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      expect(html).toContain(
        "<title>Web Performance Optimization - My Site</title>",
      );
      expect(html).toContain('data-author="Jane Smith"');
      expect(html).toContain("<h1>Web Performance Optimization</h1>");
    });
  });

  describe("markdown pages with layouts", () => {
    it("should wrap markdown content in Markdown component", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Introduction to Deno",
        },
        content: "# Introduction\n\nDeno is a modern JavaScript runtime.",
        filePath: "/pages/intro.md",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      // Should contain tabi-markdown marker with escaped content
      expect(html).toContain("<tabi-markdown>");
      expect(html).toContain("# Introduction");
      expect(html).toContain("Deno is a modern JavaScript runtime.");
      expect(html).toContain("</tabi-markdown>");
    });

    it("should compose markdown page with single layout", () => {
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
          title: "Getting Started with TypeScript",
        },
        content:
          "# Getting Started\n\nTypeScript adds static typing to JavaScript.",
        filePath: "/pages/typescript-guide.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: DocumentLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      expect(html).toContain("<title>Getting Started with TypeScript</title>");
      expect(html).toContain("<main>");
      expect(html).toContain("<tabi-markdown>");
      expect(html).toContain("# Getting Started");
      expect(html).toContain("</tabi-markdown>");
      expect(html).toContain("</main>");
    });

    it("should compose markdown page with multiple layouts", () => {
      function RootLayout({ children }: LayoutProps) {
        return (
          <html>
            <body>{children}</body>
          </html>
        );
      }

      function BlogLayout({ children }: LayoutProps) {
        const { title, author, publishedAt } = useFrontmatter();
        return (
          <article>
            <header>
              <h1>{title}</h1>
              <p>
                By {author as string} on {publishedAt as string}
              </p>
            </header>
            <div className="content">{children}</div>
          </article>
        );
      }

      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Exploring Preact",
          author: "Jane Smith",
          publishedAt: "2024-04-20",
        },
        content:
          "# Exploring Preact\n\nPreact is a lightweight React alternative.",
        filePath: "/pages/blog/preact.md",
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

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      expect(html).toContain("<html>");
      expect(html).toContain("<article>");
      expect(html).toContain("<h1>Exploring Preact</h1>");
      expect(html).toContain("<p>By Jane Smith on 2024-04-20</p>");
      expect(html).toContain('<div class="content">');
      expect(html).toContain("<tabi-markdown>");
      expect(html).toContain("# Exploring Preact");
    });

    it("should allow markdown page to access frontmatter through layouts", () => {
      function ContentLayout({ children }: LayoutProps) {
        const { tags } = useFrontmatter();
        return (
          <div>
            <div className="tags">
              {(tags as string[]).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="markdown-content">{children}</div>
          </div>
        );
      }

      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: {
          title: "Web Components Guide",
          tags: ["web-components", "html", "javascript"],
        },
        content: "# Web Components\n\nA guide to modern web components.",
        filePath: "/pages/web-components.md",
      };

      const layouts: LoadedLayout[] = [
        {
          component: ContentLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      expect(html).toContain('<span class="tag">web-components</span>');
      expect(html).toContain('<span class="tag">html</span>');
      expect(html).toContain('<span class="tag">javascript</span>');
      expect(html).toContain('<div class="markdown-content">');
      expect(html).toContain("<tabi-markdown>");
    });
  });

  describe("edge cases", () => {
    it("should handle empty frontmatter", () => {
      function SimplePage() {
        return <div>Content</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: {},
        component: SimplePage,
        filePath: "/pages/simple.tsx",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      expect(html).toContain("<div>Content</div>");
    });

    it("should handle markdown page with empty content", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Empty Page" },
        content: "",
        filePath: "/pages/empty.md",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      expect(html).toContain("<tabi-markdown></tabi-markdown>");
    });

    it("should handle page component returning null", () => {
      function EmptyPage() {
        return null;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Empty" },
        component: EmptyPage as ComponentType,
        filePath: "/pages/empty.tsx",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      // Should still render FrontmatterProvider wrapper
      expect(html).toBe("");
    });

    it("should handle markdown with special characters", () => {
      const page: LoadedMarkdownPage = {
        type: "markdown",
        frontmatter: { title: "Special Characters" },
        content: '# Title with "quotes" & <tags>',
        filePath: "/pages/special.md",
      };

      const Tree = composeTree(page, []);
      const html = render(<Tree />);

      // Content should be escaped within tabi-markdown
      expect(html).toContain("<tabi-markdown>");
      expect(html).toContain("&quot;");
      expect(html).toContain("&lt;");
      expect(html).toContain("&gt;");
    });
  });

  describe("FrontmatterProvider integration", () => {
    it("should provide frontmatter to deeply nested components", () => {
      function DeepChild() {
        const { title } = useFrontmatter();
        return <span data-deep-title={title}>{title}</span>;
      }

      function MiddleComponent() {
        return (
          <div>
            <DeepChild />
          </div>
        );
      }

      function PageContent() {
        return (
          <article>
            <MiddleComponent />
          </article>
        );
      }

      function OuterLayout({ children }: LayoutProps) {
        const { title } = useFrontmatter();
        return <div data-outer-title={title}>{children}</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Deep Nesting Test" },
        component: PageContent,
        filePath: "/pages/deep.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: OuterLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const Tree = composeTree(page, layouts);
      const html = render(<Tree />);

      expect(html).toContain('data-outer-title="Deep Nesting Test"');
      expect(html).toContain('data-deep-title="Deep Nesting Test"');
      expect(html).toContain("<span");
      expect(html).toContain(">Deep Nesting Test</span>");
    });

    it("should provide the same frontmatter reference to all components", () => {
      const capturedFrontmatter: Array<Record<string, unknown>> = [];

      function CaptureInPage() {
        capturedFrontmatter.push(useFrontmatter());
        return <div>Page</div>;
      }

      function CaptureInLayout({ children }: LayoutProps) {
        capturedFrontmatter.push(useFrontmatter());
        return <div>{children}</div>;
      }

      const page: LoadedTsxPage = {
        type: "tsx",
        frontmatter: { title: "Reference Test", custom: "value" },
        component: CaptureInPage,
        filePath: "/pages/reference.tsx",
      };

      const layouts: LoadedLayout[] = [
        {
          component: CaptureInLayout,
          filePath: "/pages/_layout.tsx",
          directory: "/pages",
        },
      ];

      const Tree = composeTree(page, layouts);
      render(<Tree />);

      // All captured frontmatter should be the same reference
      expect(capturedFrontmatter.length).toBe(2);
      expect(capturedFrontmatter[0]).toBe(capturedFrontmatter[1]);
      expect(capturedFrontmatter[0].title).toBe("Reference Test");
      expect(capturedFrontmatter[0].custom).toBe("value");
    });
  });
});

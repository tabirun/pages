import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import type { ComponentChildren } from "preact";
import { DefaultDocument } from "../document.tsx";

describe("DefaultDocument", () => {
  describe("document structure", () => {
    it("renders html, head, and body elements", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div>Content</div>
        </DefaultDocument>,
      );

      expect(html).toContain('<html lang="en">');
      expect(html).toContain("</html>");
      expect(html).toContain("<head>");
      expect(html).toContain("</head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
    });

    it("includes default lang attribute", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div>Content</div>
        </DefaultDocument>,
      );

      expect(html).toContain('lang="en"');
    });

    it("includes default meta charset tag", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div>Content</div>
        </DefaultDocument>,
      );

      expect(html).toContain('<meta charset="UTF-8"');
    });

    it("includes default meta viewport tag", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div>Content</div>
        </DefaultDocument>,
      );

      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"',
      );
    });

    it("places meta tags in head", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div>Content</div>
        </DefaultDocument>,
      );

      const headStart = html.indexOf("<head>");
      const headEnd = html.indexOf("</head>");
      const charsetIndex = html.indexOf('charset="UTF-8"');
      const viewportIndex = html.indexOf('name="viewport"');

      expect(charsetIndex).toBeGreaterThan(headStart);
      expect(charsetIndex).toBeLessThan(headEnd);
      expect(viewportIndex).toBeGreaterThan(headStart);
      expect(viewportIndex).toBeLessThan(headEnd);
    });
  });

  describe("head content injection", () => {
    it("injects head content after default meta tags", () => {
      const html = render(
        <DefaultDocument head={<title>My Application</title>}>
          <div>Content</div>
        </DefaultDocument>,
      );

      expect(html).toContain("<title>My Application</title>");

      // Head content should appear after viewport meta
      const viewportIndex = html.indexOf('name="viewport"');
      const titleIndex = html.indexOf("<title>");
      expect(titleIndex).toBeGreaterThan(viewportIndex);
    });

    it("handles null head content", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div>Content</div>
        </DefaultDocument>,
      );

      // Should still have default meta tags
      expect(html).toContain('<meta charset="UTF-8"');
      expect(html).toContain('<meta name="viewport"');
    });

    it("renders custom title element in head", () => {
      const html = render(
        <DefaultDocument head={<title>Dashboard - My App</title>}>
          <div>Page content</div>
        </DefaultDocument>,
      );

      expect(html).toContain("<title>Dashboard - My App</title>");
    });

    it("renders custom meta description in head", () => {
      const html = render(
        <DefaultDocument
          head={<meta name="description" content="A comprehensive dashboard" />}
        >
          <div>Page content</div>
        </DefaultDocument>,
      );

      expect(html).toContain('name="description"');
      expect(html).toContain('content="A comprehensive dashboard"');
    });

    it("renders multiple custom head elements", () => {
      const html = render(
        <DefaultDocument
          head={
            <>
              <title>Blog Post</title>
              <meta name="description" content="An interesting article" />
              <meta property="og:title" content="Blog Post" />
              <link rel="canonical" href="https://example.com/blog/post" />
            </>
          }
        >
          <div>Article content</div>
        </DefaultDocument>,
      );

      expect(html).toContain("<title>Blog Post</title>");
      expect(html).toContain('name="description"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('rel="canonical"');
    });
  });

  describe("children rendering", () => {
    it("renders children in body", () => {
      const html = render(
        <DefaultDocument head={null}>
          <main>
            <h1>Welcome</h1>
            <p>This is the main content</p>
          </main>
        </DefaultDocument>,
      );

      expect(html).toContain("<main>");
      expect(html).toContain("<h1>Welcome</h1>");
      expect(html).toContain("<p>This is the main content</p>");
    });

    it("renders complex component tree as children", () => {
      const html = render(
        <DefaultDocument head={<title>App</title>}>
          <div id="__tabi__">
            <header>
              <nav>Navigation</nav>
            </header>
            <main>
              <article>
                <h1>Article Title</h1>
                <p>Article content goes here.</p>
              </article>
            </main>
            <footer>Footer content</footer>
          </div>
        </DefaultDocument>,
      );

      expect(html).toContain('<div id="__tabi__">');
      expect(html).toContain("<header>");
      expect(html).toContain("<nav>Navigation</nav>");
      expect(html).toContain("<main>");
      expect(html).toContain("<article>");
      expect(html).toContain("<footer>Footer content</footer>");
    });

    it("handles null children", () => {
      const html = render(
        <DefaultDocument head={null}>{null}</DefaultDocument>,
      );

      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
    });

    it("handles text-only children", () => {
      const html = render(
        <DefaultDocument head={null}>Plain text content</DefaultDocument>,
      );

      expect(html).toContain("<body>Plain text content</body>");
    });

    it("renders children with hydration root from renderer", () => {
      // This simulates what the renderer will pass - body content
      // already wrapped in hydration root with scripts
      const bodyFromRenderer = (
        <>
          <div id="__tabi__">
            <main>Page content</main>
          </div>
          <div
            dangerouslySetInnerHTML={{
              __html:
                '<script id="__TABI_DATA__" type="application/json">{}</script>',
            }}
          />
          <div
            dangerouslySetInnerHTML={{
              __html: '<script type="module" src="/_tabi/page.js"></script>',
            }}
          />
        </>
      );

      const html = render(
        <DefaultDocument head={<title>Page</title>}>
          {bodyFromRenderer}
        </DefaultDocument>,
      );

      expect(html).toContain('<div id="__tabi__">');
      expect(html).toContain("<main>Page content</main>");
      expect(html).toContain('<script id="__TABI_DATA__"');
      expect(html).toContain('<script type="module" src="/_tabi/page.js">');
    });
  });

  describe("body structure", () => {
    it("places children directly in body", () => {
      const html = render(
        <DefaultDocument head={null}>
          <div id="content">Page content</div>
        </DefaultDocument>,
      );

      // Children should be directly in body
      expect(html).toContain('<body><div id="content">');
    });

    it("maintains correct element nesting", () => {
      const html = render(
        <DefaultDocument
          head={
            <>
              <title>Test Page</title>
              <meta name="description" content="Test description" />
            </>
          }
        >
          <div id="__tabi__">
            <main>Content</main>
          </div>
        </DefaultDocument>,
      );

      // Verify nesting order
      const htmlIndex = html.indexOf("<html>");
      const headIndex = html.indexOf("<head>");
      const bodyIndex = html.indexOf("<body>");
      const contentIndex = html.indexOf("Content");

      expect(htmlIndex).toBeLessThan(headIndex);
      expect(headIndex).toBeLessThan(bodyIndex);
      expect(bodyIndex).toBeLessThan(contentIndex);
    });
  });

  describe("custom document compatibility", () => {
    it("demonstrates simple custom document pattern", () => {
      // This test documents the expected custom document API
      function CustomDocument({
        head,
        children,
      }: {
        head: ComponentChildren;
        children: ComponentChildren;
      }) {
        return (
          <html lang="en">
            <head>
              <meta charSet="UTF-8" />
              <link rel="icon" href="/favicon.ico" />
              {head}
            </head>
            <body className="dark">{children}</body>
          </html>
        );
      }

      const html = render(
        <CustomDocument head={<title>Custom</title>}>
          <main>Content</main>
        </CustomDocument>,
      );

      expect(html).toContain('lang="en"');
      expect(html).toContain('href="/favicon.ico"');
      expect(html).toContain('class="dark"');
      expect(html).toContain("<title>Custom</title>");
      expect(html).toContain("<main>Content</main>");
    });

    it("custom document can add body wrappers around children", () => {
      function CustomDocument({
        head,
        children,
      }: {
        head: ComponentChildren;
        children: ComponentChildren;
      }) {
        return (
          <html>
            <head>{head}</head>
            <body>
              <div className="app-wrapper">{children}</div>
            </body>
          </html>
        );
      }

      const html = render(
        <CustomDocument head={<title>Wrapped</title>}>
          <main>Content</main>
        </CustomDocument>,
      );

      expect(html).toContain('<div class="app-wrapper">');
      expect(html).toContain("<main>Content</main>");
    });
  });
});

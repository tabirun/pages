import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import { Head } from "../head.tsx";

describe("Head", () => {
  describe("server rendering", () => {
    it("should render tabi-head marker element", () => {
      const html = render(
        <Head>
          <title>Test Page</title>
        </Head>,
      );

      expect(html).toMatch(/^<tabi-head>.*<\/tabi-head>$/);
    });

    it("should render title element", () => {
      const html = render(
        <Head>
          <title>My Application</title>
        </Head>,
      );

      expect(html).toContain("&lt;title&gt;");
      expect(html).toContain("My Application");
      expect(html).toContain("&lt;/title&gt;");
    });

    it("should render meta tags", () => {
      const html = render(
        <Head>
          <meta name="description" content="A page description" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>,
      );

      expect(html).toContain("&lt;meta");
      expect(html).toContain("name=&quot;description&quot;");
      expect(html).toContain("content=&quot;A page description&quot;");
      expect(html).toContain("name=&quot;viewport&quot;");
    });

    it("should render link tags", () => {
      const html = render(
        <Head>
          <link rel="stylesheet" href="/styles.css" />
          <link rel="icon" href="/favicon.ico" />
        </Head>,
      );

      expect(html).toContain("&lt;link");
      expect(html).toContain("rel=&quot;stylesheet&quot;");
      expect(html).toContain("href=&quot;/styles.css&quot;");
      expect(html).toContain("rel=&quot;icon&quot;");
    });

    it("should render multiple children", () => {
      const html = render(
        <Head>
          <title>Dashboard</title>
          <meta name="description" content="User dashboard" />
          <link rel="canonical" href="https://example.com/dashboard" />
        </Head>,
      );

      expect(html).toContain("Dashboard");
      expect(html).toContain("User dashboard");
      expect(html).toContain("https://example.com/dashboard");
    });

    it("should escape HTML entities in content", () => {
      const html = render(
        <Head>
          <title>{'Page with <special> & "chars"'}</title>
        </Head>,
      );

      // Title content is first escaped by Preact, then our escape doubles it
      expect(html).toContain("&lt;title&gt;");
      // The < in title text: Preact escapes to &lt;, then our escape makes &amp;lt;
      expect(html).toContain("&amp;lt;special&gt;");
      expect(html).toContain("&amp;amp;");
    });

    it("should handle empty children", () => {
      const html = render(<Head>{null}</Head>);

      expect(html).toBe("<tabi-head></tabi-head>");
    });

    it("should render script tags", () => {
      const html = render(
        <Head>
          <script src="/analytics.js" async />
        </Head>,
      );

      expect(html).toContain("&lt;script");
      expect(html).toContain("src=&quot;/analytics.js&quot;");
    });

    it("should render Open Graph meta tags", () => {
      const html = render(
        <Head>
          <meta property="og:title" content="Article Title" />
          <meta property="og:description" content="Article description" />
          <meta property="og:image" content="https://example.com/image.jpg" />
        </Head>,
      );

      expect(html).toContain("property=&quot;og:title&quot;");
      expect(html).toContain("Article Title");
      expect(html).toContain("property=&quot;og:image&quot;");
    });
  });

  describe("client rendering", () => {
    beforeEach(() => {
      (globalThis as Record<string, unknown>).window = {};
    });

    afterEach(() => {
      delete (globalThis as Record<string, unknown>).window;
    });

    it("should return null on client", () => {
      const html = render(
        <Head>
          <title>Client Title</title>
        </Head>,
      );

      expect(html).toBe("");
    });

    it("should not render marker on client", () => {
      const html = render(
        <Head>
          <meta name="description" content="Client meta" />
        </Head>,
      );

      expect(html).not.toContain("tabi-head");
      expect(html).not.toContain("description");
    });
  });
});

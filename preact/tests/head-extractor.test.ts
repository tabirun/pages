import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { processHeadMarkers } from "../head-extractor.ts";

describe("processHeadMarkers", () => {
  describe("marker extraction", () => {
    it("should extract single head marker", () => {
      const input =
        "<div><tabi-head>&lt;title&gt;Test&lt;/title&gt;</tabi-head></div>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe("<title>Test</title>");
      expect(result.html).toBe("<div></div>");
    });

    it("should extract multiple head markers", () => {
      const input = "<tabi-head>&lt;title&gt;Page&lt;/title&gt;</tabi-head>" +
        "<main>Content</main>" +
        "<tabi-head>&lt;meta name=&quot;description&quot; content=&quot;Desc&quot;&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe(
        '<title>Page</title>\n<meta name="description" content="Desc">',
      );
      expect(result.html).toBe("<main>Content</main>");
    });

    it("should preserve marker order in output", () => {
      const input =
        "<tabi-head>&lt;meta name=&quot;first&quot;&gt;</tabi-head>" +
        "<tabi-head>&lt;meta name=&quot;second&quot;&gt;</tabi-head>" +
        "<tabi-head>&lt;meta name=&quot;third&quot;&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe(
        '<meta name="first">\n<meta name="second">\n<meta name="third">',
      );
    });

    it("should return empty head for no markers", () => {
      const input = "<div><h1>Hello</h1><p>World</p></div>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe("");
      expect(result.html).toBe(input);
    });

    it("should handle empty input", () => {
      const result = processHeadMarkers("");

      expect(result.head).toBe("");
      expect(result.html).toBe("");
    });

    it("should handle malformed nested markers", () => {
      const input =
        "<tabi-head>&lt;tabi-head&gt;&lt;meta&gt;&lt;/tabi-head&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      // Non-greedy regex extracts outermost marker, inner escaped markers become literal text
      expect(result.head).toBe("<tabi-head><meta></tabi-head>");
      expect(result.html).toBe("");
    });
  });

  describe("HTML unescaping", () => {
    it("should unescape &lt; and &gt;", () => {
      const input = "<tabi-head>&lt;title&gt;Test&lt;/title&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe("<title>Test</title>");
    });

    it("should unescape &amp;", () => {
      const input =
        "<tabi-head>&lt;title&gt;A &amp;amp; B&lt;/title&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe("<title>A &amp; B</title>");
    });

    it("should unescape &quot;", () => {
      const input =
        "<tabi-head>&lt;meta content=&quot;value&quot;&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe('<meta content="value">');
    });

    it("should unescape &#39;", () => {
      const input =
        "<tabi-head>&lt;meta content=&#39;value&#39;&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe("<meta content='value'>");
    });
  });

  describe("surrounding content preservation", () => {
    it("should preserve content before marker", () => {
      const input =
        "<header>Navigation</header><tabi-head>&lt;title&gt;T&lt;/title&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.html).toBe("<header>Navigation</header>");
    });

    it("should preserve content after marker", () => {
      const input =
        "<tabi-head>&lt;title&gt;T&lt;/title&gt;</tabi-head><footer>Footer</footer>";
      const result = processHeadMarkers(input);

      expect(result.html).toBe("<footer>Footer</footer>");
    });

    it("should preserve content between markers", () => {
      const input = "<tabi-head>&lt;title&gt;T&lt;/title&gt;</tabi-head>" +
        "<main>Main Content</main>" +
        "<tabi-head>&lt;meta name=&quot;x&quot;&gt;</tabi-head>";
      const result = processHeadMarkers(input);

      expect(result.html).toBe("<main>Main Content</main>");
    });

    it("should handle markers at different nesting levels", () => {
      const input = "<article>" +
        "<tabi-head>&lt;title&gt;Nested&lt;/title&gt;</tabi-head>" +
        "<p>Paragraph</p>" +
        "</article>";
      const result = processHeadMarkers(input);

      expect(result.head).toBe("<title>Nested</title>");
      expect(result.html).toBe("<article><p>Paragraph</p></article>");
    });
  });

  describe("realistic scenarios", () => {
    it("should handle typical page structure", () => {
      const input =
        "<tabi-head>&lt;title&gt;My Blog Post&lt;/title&gt;</tabi-head>" +
        "<tabi-head>&lt;meta name=&quot;description&quot; content=&quot;A blog post about TypeScript&quot;&gt;</tabi-head>" +
        "<tabi-head>&lt;link rel=&quot;canonical&quot; href=&quot;https://example.com/post&quot;&gt;</tabi-head>" +
        "<article><h1>My Blog Post</h1><p>Content here...</p></article>";

      const result = processHeadMarkers(input);

      expect(result.head).toContain("<title>My Blog Post</title>");
      expect(result.head).toContain(
        '<meta name="description" content="A blog post about TypeScript">',
      );
      expect(result.head).toContain(
        '<link rel="canonical" href="https://example.com/post">',
      );
      expect(result.html).toBe(
        "<article><h1>My Blog Post</h1><p>Content here...</p></article>",
      );
    });

    it("should handle Open Graph meta tags", () => {
      const input =
        "<tabi-head>&lt;meta property=&quot;og:title&quot; content=&quot;Share Title&quot;&gt;</tabi-head>" +
        "<tabi-head>&lt;meta property=&quot;og:image&quot; content=&quot;https://example.com/image.jpg&quot;&gt;</tabi-head>";

      const result = processHeadMarkers(input);

      expect(result.head).toContain('property="og:title"');
      expect(result.head).toContain('property="og:image"');
    });
  });
});

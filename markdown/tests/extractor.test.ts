import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { processMarkdownMarkers } from "../extractor.ts";

describe("processMarkdownMarkers", () => {
  describe("marker extraction", () => {
    it("should process single marker", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown># Hello</tabi-markdown></div>';
      const { html, cache } = await processMarkdownMarkers(input);

      expect(html).toBe('<div data-tabi-md=":r0:"><h1>Hello</h1>\n</div>');
      expect(cache.get(":r0:")).toBe("<h1>Hello</h1>\n");
    });

    it("should process multiple markers", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown># First</tabi-markdown></div>' +
        '<div data-tabi-md=":r1:"><tabi-markdown># Second</tabi-markdown></div>';
      const { html, cache } = await processMarkdownMarkers(input);

      expect(html).toBe(
        '<div data-tabi-md=":r0:"><h1>First</h1>\n</div>' +
          '<div data-tabi-md=":r1:"><h1>Second</h1>\n</div>',
      );
      expect(cache.size).toBe(2);
    });

    it("should process multiple identical content markers", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown># Same</tabi-markdown></div>' +
        '<div data-tabi-md=":r1:"><tabi-markdown># Same</tabi-markdown></div>';
      const { html, cache } = await processMarkdownMarkers(input);

      expect(html).toBe(
        '<div data-tabi-md=":r0:"><h1>Same</h1>\n</div>' +
          '<div data-tabi-md=":r1:"><h1>Same</h1>\n</div>',
      );
      expect(cache.size).toBe(2);
    });

    it("should preserve non-marker content", async () => {
      const input =
        '<header>Site</header><div data-tabi-md=":r0:"><tabi-markdown># Title</tabi-markdown></div><footer>Footer</footer>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toBe(
        '<header>Site</header><div data-tabi-md=":r0:"><h1>Title</h1>\n</div><footer>Footer</footer>',
      );
    });

    it("should return unchanged HTML when no markers present", async () => {
      const input = "<div><h1>Already HTML</h1></div>";
      const { html, cache } = await processMarkdownMarkers(input);

      expect(html).toBe("<div><h1>Already HTML</h1></div>");
      expect(cache.size).toBe(0);
    });

    it("should handle empty markers", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown></tabi-markdown></div>';
      const { html, cache } = await processMarkdownMarkers(input);

      expect(html).toBe('<div data-tabi-md=":r0:"></div>');
      expect(cache.get(":r0:")).toBe("");
    });
  });

  describe("HTML unescaping", () => {
    it("should unescape &lt; and &gt; for raw HTML", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>&lt;div&gt;content&lt;/div&gt;</tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toContain("<div>content</div>");
    });

    it("should unescape &amp; in markdown text", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>Tom &amp; Jerry</tabi-markdown></div>';
      const { cache } = await processMarkdownMarkers(input);

      // Marked re-escapes & in text output
      expect(cache.get(":r0:")).toBe("<p>Tom &amp; Jerry</p>\n");
    });

    it("should unescape &quot; in markdown text", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>&quot;quoted&quot;</tabi-markdown></div>';
      const { cache } = await processMarkdownMarkers(input);

      expect(cache.get(":r0:")).toBe("<p>&quot;quoted&quot;</p>\n");
    });

    it("should unescape &#39; in markdown text", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>it&#39;s working</tabi-markdown></div>';
      const { cache } = await processMarkdownMarkers(input);

      expect(cache.get(":r0:")).toBe("<p>it&#39;s working</p>\n");
    });

    it("should unescape entities for raw HTML passthrough", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>&lt;a href=&quot;https://example.com&quot;&gt;link&lt;/a&gt;</tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      // Marked wraps inline HTML in paragraph tags
      expect(html).toContain('<a href="https://example.com">link</a>');
    });
  });

  describe("code block handling", () => {
    it("should render code blocks with Shiki highlighting", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>```typescript\nconst x: number = 1;\n```</tabi-markdown></div>';
      const { cache } = await processMarkdownMarkers(input);

      expect(cache.get(":r0:")).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">const</span><span style="color:#79B8FF"> x</span><span style="color:#F97583">:</span><span style="color:#79B8FF"> number</span><span style="color:#F97583"> =</span><span style="color:#79B8FF"> 1</span><span style="color:#E1E4E8">;</span></span></code></pre>',
      );
    });

    it("should handle escaped code block fences", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>```typescript\nconst x = &lt;div&gt;;\n```</tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toContain('class="shiki github-dark"');
      expect(html).toContain("div");
    });
  });

  describe("class attribute handling", () => {
    it("should preserve class attribute on wrapper div", async () => {
      const input =
        '<div data-tabi-md=":r0:" class="prose"><tabi-markdown># Hello</tabi-markdown></div>';
      const { html, cache } = await processMarkdownMarkers(input);

      expect(html).toBe(
        '<div data-tabi-md=":r0:" class="prose"><h1>Hello</h1>\n</div>',
      );
      expect(cache.get(":r0:")).toBe("<h1>Hello</h1>\n");
    });

    it("should preserve multi-word class attribute", async () => {
      const input =
        '<div data-tabi-md=":r0:" class="prose prose-lg dark:prose-invert"><tabi-markdown># Hello</tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toBe(
        '<div data-tabi-md=":r0:" class="prose prose-lg dark:prose-invert"><h1>Hello</h1>\n</div>',
      );
    });

    it("should handle markers without class attribute", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown># Hello</tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toBe('<div data-tabi-md=":r0:"><h1>Hello</h1>\n</div>');
    });

    it("should handle mixed markers with and without class", async () => {
      const input =
        '<div data-tabi-md=":r0:" class="prose"><tabi-markdown># First</tabi-markdown></div>' +
        '<div data-tabi-md=":r1:"><tabi-markdown># Second</tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toBe(
        '<div data-tabi-md=":r0:" class="prose"><h1>First</h1>\n</div>' +
          '<div data-tabi-md=":r1:"><h1>Second</h1>\n</div>',
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      const { html, cache } = await processMarkdownMarkers("");

      expect(html).toBe("");
      expect(cache.size).toBe(0);
    });

    it("should handle multiline markdown content", async () => {
      const input = `<div data-tabi-md=":r0:"><tabi-markdown># Title

Paragraph text.

- Item 1
- Item 2</tabi-markdown></div>`;
      const { html } = await processMarkdownMarkers(input);

      expect(html).toContain("<h1>Title</h1>");
      expect(html).toContain("<p>Paragraph text.</p>");
      expect(html).toContain("<li>Item 1</li>");
      expect(html).toContain("<li>Item 2</li>");
    });

    it("should handle markers with surrounding whitespace in content", async () => {
      const input =
        '<div data-tabi-md=":r0:"><tabi-markdown>  # Padded  </tabi-markdown></div>';
      const { html } = await processMarkdownMarkers(input);

      expect(html).toContain("Padded");
    });
  });
});

import { afterEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { processMarkdownMarkers } from "../extractor.ts";
import { _resetShikiForTesting } from "../shiki.ts";

describe("processMarkdownMarkers", () => {
  afterEach(() => {
    _resetShikiForTesting();
  });

  describe("marker extraction", () => {
    it("should process single marker", async () => {
      const input = "<div><tabi-markdown># Hello</tabi-markdown></div>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe("<div><h1>Hello</h1>\n</div>");
    });

    it("should process multiple markers", async () => {
      const input =
        "<div><tabi-markdown># First</tabi-markdown></div><div><tabi-markdown># Second</tabi-markdown></div>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe(
        "<div><h1>First</h1>\n</div><div><h1>Second</h1>\n</div>",
      );
    });

    it("should process multiple identical markers", async () => {
      const input =
        "<div><tabi-markdown># Same</tabi-markdown></div><div><tabi-markdown># Same</tabi-markdown></div>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe(
        "<div><h1>Same</h1>\n</div><div><h1>Same</h1>\n</div>",
      );
    });

    it("should preserve non-marker content", async () => {
      const input =
        "<header>Site</header><tabi-markdown># Title</tabi-markdown><footer>Footer</footer>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe(
        "<header>Site</header><h1>Title</h1>\n<footer>Footer</footer>",
      );
    });

    it("should return unchanged HTML when no markers present", async () => {
      const input = "<div><h1>Already HTML</h1></div>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe("<div><h1>Already HTML</h1></div>");
    });

    it("should handle empty markers", async () => {
      const input = "<div><tabi-markdown></tabi-markdown></div>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe("<div></div>");
    });
  });

  describe("HTML unescaping", () => {
    it("should unescape &lt; and &gt; for raw HTML", async () => {
      const input =
        "<tabi-markdown>&lt;div&gt;content&lt;/div&gt;</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      expect(output).toContain("<div>content</div>");
    });

    it("should unescape &amp; in markdown text", async () => {
      const input = "<tabi-markdown>Tom &amp; Jerry</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      // Marked re-escapes & in text output
      expect(output).toBe("<p>Tom &amp; Jerry</p>\n");
    });

    it("should unescape &quot; in markdown text", async () => {
      const input = "<tabi-markdown>&quot;quoted&quot;</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe("<p>&quot;quoted&quot;</p>\n");
    });

    it("should unescape &#39; in markdown text", async () => {
      const input = "<tabi-markdown>it&#39;s working</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe("<p>it&#39;s working</p>\n");
    });

    it("should unescape entities for raw HTML passthrough", async () => {
      const input =
        "<tabi-markdown>&lt;a href=&quot;https://example.com&quot;&gt;link&lt;/a&gt;</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      // Marked wraps inline HTML in paragraph tags
      expect(output).toContain('<a href="https://example.com">link</a>');
    });
  });

  describe("code block handling", () => {
    it("should render code blocks with Shiki highlighting", async () => {
      const input =
        "<tabi-markdown>```typescript\nconst x: number = 1;\n```</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      expect(output).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">const</span><span style="color:#79B8FF"> x</span><span style="color:#F97583">:</span><span style="color:#79B8FF"> number</span><span style="color:#F97583"> =</span><span style="color:#79B8FF"> 1</span><span style="color:#E1E4E8">;</span></span></code></pre>',
      );
    });

    it("should handle escaped code block fences", async () => {
      const input =
        "<tabi-markdown>```typescript\nconst x = &lt;div&gt;;\n```</tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      expect(output).toContain('class="shiki github-dark"');
      expect(output).toContain("div");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      const output = await processMarkdownMarkers("");

      expect(output).toBe("");
    });

    it("should handle multiline markdown content", async () => {
      const input = `<tabi-markdown># Title

Paragraph text.

- Item 1
- Item 2</tabi-markdown>`;
      const output = await processMarkdownMarkers(input);

      expect(output).toContain("<h1>Title</h1>");
      expect(output).toContain("<p>Paragraph text.</p>");
      expect(output).toContain("<li>Item 1</li>");
      expect(output).toContain("<li>Item 2</li>");
    });

    it("should handle markers with surrounding whitespace", async () => {
      const input = "<tabi-markdown>  # Padded  </tabi-markdown>";
      const output = await processMarkdownMarkers(input);

      expect(output).toContain("Padded");
    });
  });
});

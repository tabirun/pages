import { afterEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { renderMarkdown } from "../renderer.ts";
import { _resetShikiForTesting } from "../shiki.ts";

describe("renderMarkdown", () => {
  afterEach(() => {
    _resetShikiForTesting();
  });

  describe("basic markdown", () => {
    it("should render heading", async () => {
      const html = await renderMarkdown("# Hello World");

      expect(html).toBe("<h1>Hello World</h1>\n");
    });

    it("should render multiple heading levels", async () => {
      const html = await renderMarkdown("# H1\n## H2\n### H3");

      expect(html).toBe("<h1>H1</h1>\n<h2>H2</h2>\n<h3>H3</h3>\n");
    });

    it("should render paragraph", async () => {
      const html = await renderMarkdown("This is a paragraph.");

      expect(html).toBe("<p>This is a paragraph.</p>\n");
    });

    it("should render multiple paragraphs", async () => {
      const html = await renderMarkdown(
        "First paragraph.\n\nSecond paragraph.",
      );

      expect(html).toBe(
        "<p>First paragraph.</p>\n<p>Second paragraph.</p>\n",
      );
    });

    it("should render unordered list", async () => {
      const html = await renderMarkdown("- Item 1\n- Item 2\n- Item 3");

      expect(html).toBe(
        "<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n<li>Item 3</li>\n</ul>\n",
      );
    });

    it("should render ordered list", async () => {
      const html = await renderMarkdown("1. First\n2. Second\n3. Third");

      expect(html).toBe(
        "<ol>\n<li>First</li>\n<li>Second</li>\n<li>Third</li>\n</ol>\n",
      );
    });

    it("should render inline formatting", async () => {
      const html = await renderMarkdown(
        "**bold** and *italic* and `code`",
      );

      expect(html).toBe(
        "<p><strong>bold</strong> and <em>italic</em> and <code>code</code></p>\n",
      );
    });

    it("should render links", async () => {
      const html = await renderMarkdown("[Example](https://example.com)");

      expect(html).toBe('<p><a href="https://example.com">Example</a></p>\n');
    });

    it("should render blockquote", async () => {
      const html = await renderMarkdown("> This is a quote");

      expect(html).toBe(
        "<blockquote>\n<p>This is a quote</p>\n</blockquote>\n",
      );
    });
  });

  describe("GFM features", () => {
    it("should render strikethrough", async () => {
      const html = await renderMarkdown("~~deleted~~");

      expect(html).toBe("<p><del>deleted</del></p>\n");
    });

    it("should render table", async () => {
      const markdown = `| Name | Age |
| --- | --- |
| Alice | 30 |
| Bob | 25 |`;

      const html = await renderMarkdown(markdown);

      expect(html).toBe(
        "<table>\n<thead>\n<tr>\n<th>Name</th>\n<th>Age</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Alice</td>\n<td>30</td>\n</tr>\n<tr>\n<td>Bob</td>\n<td>25</td>\n</tr>\n</tbody></table>\n",
      );
    });

    it("should render task list", async () => {
      const html = await renderMarkdown("- [x] Done\n- [ ] Todo");

      expect(html).toBe(
        '<ul>\n<li><input checked="" disabled="" type="checkbox"> Done</li>\n<li><input disabled="" type="checkbox"> Todo</li>\n</ul>\n',
      );
    });

    it("should autolink URLs", async () => {
      const html = await renderMarkdown("Visit https://example.com today");

      expect(html).toBe(
        '<p>Visit <a href="https://example.com">https://example.com</a> today</p>\n',
      );
    });
  });

  describe("code blocks", () => {
    it("should highlight TypeScript code", async () => {
      const html = await renderMarkdown(
        "```typescript\nconst x: number = 1;\n```",
      );

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">const</span><span style="color:#79B8FF"> x</span><span style="color:#F97583">:</span><span style="color:#79B8FF"> number</span><span style="color:#F97583"> =</span><span style="color:#79B8FF"> 1</span><span style="color:#E1E4E8">;</span></span></code></pre>',
      );
    });

    it("should highlight JavaScript code", async () => {
      const html = await renderMarkdown(
        '```javascript\nfunction greet() { return "hi"; }\n```',
      );

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">function</span><span style="color:#B392F0"> greet</span><span style="color:#E1E4E8">() { </span><span style="color:#F97583">return</span><span style="color:#9ECBFF"> "hi"</span><span style="color:#E1E4E8">; }</span></span></code></pre>',
      );
    });

    it("should highlight Python code", async () => {
      const html = await renderMarkdown(
        "```python\ndef hello():\n    pass\n```",
      );

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">def</span><span style="color:#B392F0"> hello</span><span style="color:#E1E4E8">():</span></span>\n<span class="line"><span style="color:#F97583">    pass</span></span></code></pre>',
      );
    });

    it("should use language alias ts for typescript", async () => {
      const html = await renderMarkdown("```ts\nconst x = 1;\n```");

      expect(html).toContain('class="shiki github-dark"');
      expect(html).toContain("const");
    });

    it("should fall back to plain text for unknown language", async () => {
      const html = await renderMarkdown(
        "```unknownlang\nsome code here\n```",
      );

      expect(html).toBe("<pre><code>some code here</code></pre>");
    });

    it("should handle code block without language", async () => {
      const html = await renderMarkdown("```\nplain text\n```");

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span>plain text</span></span></code></pre>',
      );
    });

    it("should escape HTML in fallback code blocks", async () => {
      const html = await renderMarkdown(
        "```unknownlang\n<script>alert('xss')</script>\n```",
      );

      expect(html).toBe(
        "<pre><code>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</code></pre>",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      const html = await renderMarkdown("");

      expect(html).toBe("");
    });

    it("should handle whitespace only", async () => {
      const html = await renderMarkdown("   \n\n   ");

      expect(html).toBe("");
    });

    it("should handle unclosed formatting", async () => {
      const html = await renderMarkdown("**unclosed bold");

      expect(html).toBe("<p>**unclosed bold</p>\n");
    });

    it("should handle deeply nested lists", async () => {
      const html = await renderMarkdown(
        "- Level 1\n  - Level 2\n    - Level 3",
      );

      expect(html).toContain("<ul>");
      expect(html).toContain("Level 1");
      expect(html).toContain("Level 2");
      expect(html).toContain("Level 3");
    });

    it("should handle mixed content", async () => {
      const markdown = `# Title

Paragraph with **bold** and *italic*.

\`\`\`typescript
const x = 1;
\`\`\`

- List item`;

      const html = await renderMarkdown(markdown);

      expect(html).toContain("<h1>Title</h1>");
      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<em>italic</em>");
      expect(html).toContain('class="shiki github-dark"');
      expect(html).toContain("<li>List item</li>");
    });
  });
});

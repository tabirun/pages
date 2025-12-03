import { afterEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import { Markdown } from "../markdown.tsx";

describe("Markdown", () => {
  describe("server rendering", () => {
    it("should render tabi-markdown marker", () => {
      const html = render(<Markdown># Hello</Markdown>);

      expect(html).toContain("<tabi-markdown>");
      expect(html).toContain("</tabi-markdown>");
    });

    it("should include content inside marker", () => {
      const html = render(<Markdown># Hello World</Markdown>);

      expect(html).toContain("# Hello World");
    });

    it("should escape HTML entities in content", () => {
      const html = render(<Markdown>{"<div>test</div>"}</Markdown>);

      expect(html).toContain("&lt;div&gt;test&lt;/div&gt;");
      expect(html).not.toContain("<div>test</div>");
    });

    it("should escape ampersands", () => {
      const html = render(<Markdown>Tom & Jerry</Markdown>);

      expect(html).toContain("Tom &amp; Jerry");
    });

    it("should escape quotes", () => {
      const html = render(<Markdown>Say "hello"</Markdown>);

      expect(html).toContain("Say &quot;hello&quot;");
    });

    it("should handle multiline content", () => {
      const content = `# Title

Paragraph text.

\`\`\`ts
const x = 1;
\`\`\``;
      const html = render(<Markdown>{content}</Markdown>);

      expect(html).toContain("# Title");
      expect(html).toContain("Paragraph text.");
      expect(html).toContain("const x = 1;");
    });

    it("should handle empty content", () => {
      const html = render(<Markdown />);

      expect(html).toContain("<tabi-markdown></tabi-markdown>");
    });

    it("should wrap marker in div element with data attribute", () => {
      const html = render(<Markdown>test</Markdown>);

      expect(html).toMatch(/^<div data-tabi-md="[^"]+">.*<\/div>$/);
    });
  });

  describe("client rendering", () => {
    afterEach(() => {
      // Restore server environment
      delete (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).document;
    });

    it("should preserve content from SSR on client", () => {
      // Simulate client environment
      (globalThis as Record<string, unknown>).window = {};
      (globalThis as Record<string, unknown>).document = {
        querySelector: () => ({
          innerHTML: "<p>preserved content</p>",
        }),
      };

      const html = render(<Markdown># Hello</Markdown>);

      expect(html).toContain("preserved content");
      expect(html).toContain("data-tabi-md");
      expect(html).not.toContain("tabi-markdown");
    });

    it("should render empty div when element not found", () => {
      // Simulate client environment with no matching element (edge case)
      (globalThis as Record<string, unknown>).window = {};
      (globalThis as Record<string, unknown>).document = {
        querySelector: () => null,
      };

      const html = render(<Markdown># Hello</Markdown>);

      // Falls back to empty content when SSR element can't be found
      expect(html).toMatch(/^<div data-tabi-md="[^"]+"><\/div>$/);
    });
  });
});

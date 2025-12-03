import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import { Code } from "../code.tsx";

describe("Code", () => {
  describe("code fence generation", () => {
    it("should wrap content in code fences with language", () => {
      const html = render(<Code lang="typescript">const x = 1;</Code>);

      expect(html).toContain("```typescript");
      expect(html).toContain("const x = 1;");
      expect(html).toContain("```");
    });

    it("should wrap content in code fences without language", () => {
      const html = render(<Code>const x = 1;</Code>);

      expect(html).toContain("```\n");
      expect(html).toContain("const x = 1;");
    });

    it("should handle different languages", () => {
      const tsHtml = render(<Code lang="ts">code</Code>);
      const pyHtml = render(<Code lang="python">code</Code>);
      const jsHtml = render(<Code lang="javascript">code</Code>);

      expect(tsHtml).toContain("```ts");
      expect(pyHtml).toContain("```python");
      expect(jsHtml).toContain("```javascript");
    });
  });

  describe("content handling", () => {
    it("should handle multiline code content", () => {
      const code = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`;
      const html = render(<Code lang="typescript">{code}</Code>);

      expect(html).toContain("function greet");
      expect(html).toContain("return");
    });

    it("should handle special characters in code", () => {
      const code = "const x = a < b && c > d ? \"yes\" : 'no';";
      const html = render(<Code lang="typescript">{code}</Code>);

      // Characters should be escaped for HTML
      expect(html).toContain("&lt;");
      expect(html).toContain("&gt;");
      expect(html).toContain("&amp;&amp;");
    });

    it("should handle empty code content", () => {
      const html = render(<Code lang="typescript" />);

      expect(html).toContain("```typescript");
      expect(html).toContain("```");
    });

    it("should handle code with HTML tags", () => {
      const code = "const el = <div className='test'>Hello</div>;";
      const html = render(<Code lang="tsx">{code}</Code>);

      // HTML should be escaped
      expect(html).toContain("&lt;div");
      expect(html).toContain("&lt;/div&gt;");
    });
  });

  describe("marker output", () => {
    it("should render tabi-markdown marker", () => {
      const html = render(<Code lang="typescript">const x = 1;</Code>);

      expect(html).toContain("<tabi-markdown>");
      expect(html).toContain("</tabi-markdown>");
    });

    it("should wrap in div element with data attribute", () => {
      const html = render(<Code lang="typescript">code</Code>);

      expect(html).toMatch(/^<div data-tabi-md="[^"]+">[\s\S]*<\/div>$/);
    });
  });

  describe("client rendering", () => {
    beforeEach(() => {
      // Simulate client environment
      (globalThis as Record<string, unknown>).window = {};
      // Mock document.querySelector to return element with preserved HTML
      (globalThis as Record<string, unknown>).document = {
        querySelector: () => ({
          innerHTML: "<pre><code>preserved code</code></pre>",
        }),
      };
    });

    afterEach(() => {
      // Restore server environment
      delete (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).document;
    });

    it("should preserve content from SSR on client", () => {
      const html = render(<Code lang="typescript">const x = 1;</Code>);

      expect(html).toContain("preserved code");
      expect(html).toContain("data-tabi-md");
      expect(html).not.toContain("tabi-markdown");
    });
  });
});

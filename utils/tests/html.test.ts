import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { escapeHtml, unescapeHtml } from "../html.ts";

describe("escapeHtml", () => {
  it("should escape ampersand", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("should escape less than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("should escape greater than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("should escape double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("it's working")).toBe("it&#39;s working");
  });

  it("should escape all special characters in one string", () => {
    expect(escapeHtml("<div class=\"test\">Tom's & Jerry's</div>")).toBe(
      "&lt;div class=&quot;test&quot;&gt;Tom&#39;s &amp; Jerry&#39;s&lt;/div&gt;",
    );
  });

  it("should handle empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should return unchanged string with no special characters", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("should handle string with only special characters", () => {
    expect(escapeHtml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("should escape ampersand before other entities to avoid double escaping", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("unescapeHtml", () => {
  it("should unescape ampersand", () => {
    expect(unescapeHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("should unescape less than", () => {
    expect(unescapeHtml("a &lt; b")).toBe("a < b");
  });

  it("should unescape greater than", () => {
    expect(unescapeHtml("a &gt; b")).toBe("a > b");
  });

  it("should unescape double quotes", () => {
    expect(unescapeHtml("say &quot;hello&quot;")).toBe('say "hello"');
  });

  it("should unescape single quotes", () => {
    expect(unescapeHtml("it&#39;s working")).toBe("it's working");
  });

  it("should unescape all entities in one string", () => {
    expect(
      unescapeHtml(
        "&lt;div class=&quot;test&quot;&gt;Tom&#39;s &amp; Jerry&#39;s&lt;/div&gt;",
      ),
    ).toBe("<div class=\"test\">Tom's & Jerry's</div>");
  });

  it("should handle empty string", () => {
    expect(unescapeHtml("")).toBe("");
  });

  it("should return unchanged string with no entities", () => {
    expect(unescapeHtml("hello world")).toBe("hello world");
  });

  it("should unescape ampersand last to avoid double unescaping", () => {
    expect(unescapeHtml("&amp;lt;")).toBe("&lt;");
  });

  it("should handle already unescaped content", () => {
    expect(unescapeHtml("<div>content</div>")).toBe("<div>content</div>");
  });
});

describe("escapeHtml and unescapeHtml round-trip", () => {
  it("should round-trip plain text", () => {
    const original = "hello world";
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });

  it("should round-trip text with special characters", () => {
    const original = "<div class=\"test\">Tom's & Jerry's</div>";
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });

  it("should round-trip code content", () => {
    const original = "const x = a < b && c > d ? \"yes\" : 'no';";
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });

  it("should round-trip multiline content", () => {
    const original = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`;
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });

  it("should round-trip empty string", () => {
    expect(unescapeHtml(escapeHtml(""))).toBe("");
  });
});

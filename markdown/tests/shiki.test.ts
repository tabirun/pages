import { afterEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  _resetShikiForTesting,
  configureHighlighter,
  DEFAULT_LANGUAGES,
  getHighlighter,
} from "../shiki.ts";

describe("shiki", () => {
  afterEach(() => {
    _resetShikiForTesting();
  });

  describe("getHighlighter", () => {
    it("should return a highlighter instance", async () => {
      const highlighter = await getHighlighter();

      expect(highlighter).toBeDefined();
      expect(typeof highlighter.codeToHtml).toBe("function");
    });

    it("should return the same instance on multiple calls", async () => {
      const first = await getHighlighter();
      const second = await getHighlighter();

      expect(first).toBe(second);
    });

    it("should highlight TypeScript code", async () => {
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml("const x: number = 1;", {
        lang: "typescript",
        theme: "github-dark",
      });

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">const</span><span style="color:#79B8FF"> x</span><span style="color:#F97583">:</span><span style="color:#79B8FF"> number</span><span style="color:#F97583"> =</span><span style="color:#79B8FF"> 1</span><span style="color:#E1E4E8">;</span></span></code></pre>',
      );
    });

    it("should highlight JavaScript code", async () => {
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(
        'function hello() { return "world"; }',
        {
          lang: "javascript",
          theme: "github-dark",
        },
      );

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">function</span><span style="color:#B392F0"> hello</span><span style="color:#E1E4E8">() { </span><span style="color:#F97583">return</span><span style="color:#9ECBFF"> "world"</span><span style="color:#E1E4E8">; }</span></span></code></pre>',
      );
    });

    it("should load all default languages", async () => {
      const highlighter = await getHighlighter();
      const loadedLangs = highlighter.getLoadedLanguages();

      for (const lang of DEFAULT_LANGUAGES) {
        expect(loadedLangs).toContain(lang);
      }
    });
  });

  describe("DEFAULT_LANGUAGES", () => {
    it("should include web languages", () => {
      expect(DEFAULT_LANGUAGES).toContain("typescript");
      expect(DEFAULT_LANGUAGES).toContain("javascript");
      expect(DEFAULT_LANGUAGES).toContain("tsx");
      expect(DEFAULT_LANGUAGES).toContain("jsx");
      expect(DEFAULT_LANGUAGES).toContain("html");
      expect(DEFAULT_LANGUAGES).toContain("css");
      expect(DEFAULT_LANGUAGES).toContain("json");
    });

    it("should include shell languages", () => {
      expect(DEFAULT_LANGUAGES).toContain("bash");
      expect(DEFAULT_LANGUAGES).toContain("sh");
      expect(DEFAULT_LANGUAGES).toContain("shell");
      expect(DEFAULT_LANGUAGES).toContain("zsh");
      expect(DEFAULT_LANGUAGES).toContain("powershell");
    });

    it("should include systems languages", () => {
      expect(DEFAULT_LANGUAGES).toContain("c");
      expect(DEFAULT_LANGUAGES).toContain("cpp");
      expect(DEFAULT_LANGUAGES).toContain("rust");
      expect(DEFAULT_LANGUAGES).toContain("go");
    });

    it("should include scripting languages", () => {
      expect(DEFAULT_LANGUAGES).toContain("python");
      expect(DEFAULT_LANGUAGES).toContain("ruby");
      expect(DEFAULT_LANGUAGES).toContain("php");
    });

    it("should include JVM and .NET languages", () => {
      expect(DEFAULT_LANGUAGES).toContain("java");
      expect(DEFAULT_LANGUAGES).toContain("kotlin");
      expect(DEFAULT_LANGUAGES).toContain("csharp");
    });
  });

  describe("configureHighlighter", () => {
    it("should add additional languages when called before getHighlighter", async () => {
      configureHighlighter({ additionalLangs: ["elixir"] });
      const highlighter = await getHighlighter();
      const loadedLangs = highlighter.getLoadedLanguages();

      expect(loadedLangs).toContain("elixir");
    });

    it("should have no effect when called after getHighlighter", async () => {
      const highlighter = await getHighlighter();
      configureHighlighter({ additionalLangs: ["elixir"] });
      const loadedLangs = highlighter.getLoadedLanguages();

      expect(loadedLangs).not.toContain("elixir");
    });

    it("should handle empty additionalLangs array", async () => {
      configureHighlighter({ additionalLangs: [] });
      const highlighter = await getHighlighter();
      const loadedLangs = highlighter.getLoadedLanguages();

      for (const lang of DEFAULT_LANGUAGES) {
        expect(loadedLangs).toContain(lang);
      }
    });

    it("should handle undefined additionalLangs", async () => {
      configureHighlighter({});
      const highlighter = await getHighlighter();
      const loadedLangs = highlighter.getLoadedLanguages();

      for (const lang of DEFAULT_LANGUAGES) {
        expect(loadedLangs).toContain(lang);
      }
    });

    it("should deduplicate languages when additionalLangs contains defaults", async () => {
      configureHighlighter({ additionalLangs: ["typescript", "elixir"] });
      const highlighter = await getHighlighter();
      const loadedLangs = highlighter.getLoadedLanguages();

      expect(loadedLangs).toContain("typescript");
      expect(loadedLangs).toContain("elixir");
    });
  });
});

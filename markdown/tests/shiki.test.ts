import { afterEach, beforeAll, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type { Highlighter } from "shiki";
import {
  _resetShikiForTesting,
  configureHighlighter,
  DEFAULT_LANGUAGES,
  DEFAULT_THEME,
  getConfiguredTheme,
  getHighlighter,
} from "../shiki.ts";

describe("shiki", () => {
  describe("getHighlighter", () => {
    // Reuse a single highlighter instance for these tests (expensive to create)
    let highlighter: Highlighter;

    beforeAll(async () => {
      highlighter = await getHighlighter();
    });

    it("should return a highlighter instance", () => {
      expect(highlighter).toBeDefined();
      expect(typeof highlighter.codeToHtml).toBe("function");
    });

    it("should return the same instance on multiple calls", async () => {
      const second = await getHighlighter();

      expect(highlighter).toBe(second);
    });

    it("should highlight TypeScript code", () => {
      const html = highlighter.codeToHtml("const x: number = 1;", {
        lang: "typescript",
        theme: "github-dark",
      });

      expect(html).toBe(
        '<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8" tabindex="0"><code><span class="line"><span style="color:#F97583">const</span><span style="color:#79B8FF"> x</span><span style="color:#F97583">:</span><span style="color:#79B8FF"> number</span><span style="color:#F97583"> =</span><span style="color:#79B8FF"> 1</span><span style="color:#E1E4E8">;</span></span></code></pre>',
      );
    });

    it("should highlight JavaScript code", () => {
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

    it("should load all default languages", () => {
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
    // These tests need fresh state since they test configuration before creation
    beforeAll(() => {
      _resetShikiForTesting();
    });

    afterEach(() => {
      _resetShikiForTesting();
    });

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

    it("should set custom theme when called before getHighlighter", async () => {
      configureHighlighter({ theme: "github-light" });

      expect(getConfiguredTheme()).toBe("github-light");

      const highlighter = await getHighlighter();
      const loadedThemes = highlighter.getLoadedThemes();

      expect(loadedThemes).toContain("github-light");
    });

    it("should not change theme when called after getHighlighter", async () => {
      await getHighlighter();
      configureHighlighter({ theme: "github-light" });

      expect(getConfiguredTheme()).toBe(DEFAULT_THEME);
    });
  });

  describe("DEFAULT_THEME", () => {
    it("should be github-dark", () => {
      expect(DEFAULT_THEME).toBe("github-dark");
    });
  });

  describe("getConfiguredTheme", () => {
    beforeAll(() => {
      _resetShikiForTesting();
    });

    afterEach(() => {
      _resetShikiForTesting();
    });

    it("should return default theme initially", () => {
      expect(getConfiguredTheme()).toBe(DEFAULT_THEME);
    });

    it("should return configured theme after configuration", () => {
      configureHighlighter({ theme: "nord" });

      expect(getConfiguredTheme()).toBe("nord");
    });

    it("should reset to default after _resetShikiForTesting", () => {
      configureHighlighter({ theme: "nord" });
      _resetShikiForTesting();

      expect(getConfiguredTheme()).toBe(DEFAULT_THEME);
    });
  });
});

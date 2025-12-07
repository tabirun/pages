import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import { MarkdownCacheProvider, useMarkdownCache } from "../markdown-cache.tsx";

describe("MarkdownCacheProvider", () => {
  describe("providing cache", () => {
    it("should provide cache to child components", () => {
      const initialData = {
        "id-1": "<p>Rendered markdown 1</p>",
        "id-2": "<p>Rendered markdown 2</p>",
      };

      let capturedCache: unknown = null;

      function Consumer() {
        capturedCache = useMarkdownCache();
        return <div data-has-cache={String(capturedCache !== null)} />;
      }

      const html = render(
        <MarkdownCacheProvider initialData={initialData}>
          <Consumer />
        </MarkdownCacheProvider>,
      );

      expect(html).toContain('data-has-cache="true"');
      const cache = capturedCache as Map<string, string>;
      expect(cache.get("id-1")).toBe("<p>Rendered markdown 1</p>");
      expect(cache.get("id-2")).toBe("<p>Rendered markdown 2</p>");
    });

    it("should provide empty cache when initialData is empty", () => {
      function Consumer() {
        const cache = useMarkdownCache();
        return <div data-size={String(cache?.size ?? -1)} />;
      }

      const html = render(
        <MarkdownCacheProvider initialData={{}}>
          <Consumer />
        </MarkdownCacheProvider>,
      );

      expect(html).toContain('data-size="0"');
    });

    it("should return undefined for missing keys", () => {
      const initialData = {
        "existing": "<p>Content</p>",
      };

      function Consumer() {
        const cache = useMarkdownCache();
        const missing = cache?.get("nonexistent");
        return <div data-missing={String(missing === undefined)} />;
      }

      const html = render(
        <MarkdownCacheProvider initialData={initialData}>
          <Consumer />
        </MarkdownCacheProvider>,
      );

      expect(html).toContain('data-missing="true"');
    });
  });

  describe("nested access", () => {
    it("should allow deeply nested components to access cache", () => {
      const initialData = {
        "deep-id": "<h1>Deep content</h1>",
      };

      let capturedCache: unknown = null;

      function DeepChild() {
        const cache = useMarkdownCache();
        capturedCache = cache;
        return <span data-found={String(cache?.has("deep-id"))} />;
      }

      function MiddleComponent() {
        return (
          <div>
            <DeepChild />
          </div>
        );
      }

      const html = render(
        <MarkdownCacheProvider initialData={initialData}>
          <MiddleComponent />
        </MarkdownCacheProvider>,
      );

      expect(html).toContain('data-found="true"');
      const cache = capturedCache as Map<string, string>;
      expect(cache.get("deep-id")).toBe("<h1>Deep content</h1>");
    });
  });

  describe("children rendering", () => {
    it("should render children without consumers", () => {
      const html = render(
        <MarkdownCacheProvider initialData={{}}>
          <div>Static content</div>
        </MarkdownCacheProvider>,
      );

      expect(html).toContain("<div>Static content</div>");
    });

    it("should render multiple children", () => {
      const html = render(
        <MarkdownCacheProvider initialData={{}}>
          <header>Header</header>
          <main>Main</main>
        </MarkdownCacheProvider>,
      );

      expect(html).toContain("<header>Header</header>");
      expect(html).toContain("<main>Main</main>");
    });
  });
});

describe("useMarkdownCache", () => {
  describe("outside provider", () => {
    it("should return null when used outside MarkdownCacheProvider", () => {
      let capturedCache: Map<string, string> | null | undefined;

      function OrphanConsumer() {
        capturedCache = useMarkdownCache();
        return <div />;
      }

      render(<OrphanConsumer />);

      expect(capturedCache).toBeNull();
    });
  });

  describe("return value", () => {
    it("should return a Map instance", () => {
      const initialData = { "key": "value" };
      let capturedCache: unknown = null;

      function Consumer() {
        capturedCache = useMarkdownCache();
        return <div />;
      }

      render(
        <MarkdownCacheProvider initialData={initialData}>
          <Consumer />
        </MarkdownCacheProvider>,
      );

      expect(capturedCache).toBeInstanceOf(Map);
      expect((capturedCache as Map<string, string>).get("key")).toBe("value");
    });
  });
});

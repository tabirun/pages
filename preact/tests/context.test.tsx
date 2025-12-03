import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { render } from "preact-render-to-string";
import { FrontmatterProvider, useFrontmatter } from "../context.tsx";
import type { Frontmatter } from "../types.ts";

describe("FrontmatterProvider", () => {
  describe("providing frontmatter", () => {
    it("should provide frontmatter to child components", () => {
      const frontmatter: Frontmatter = {
        title: "Test Page",
        description: "A test page description",
      };

      function Consumer() {
        const fm = useFrontmatter();
        return <div data-title={fm.title} data-desc={fm.description} />;
      }

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <Consumer />
        </FrontmatterProvider>,
      );

      expect(html).toContain('data-title="Test Page"');
      expect(html).toContain('data-desc="A test page description"');
    });

    it("should provide frontmatter with custom fields", () => {
      const frontmatter: Frontmatter = {
        title: "Custom Fields",
        author: "Jane Doe",
        tags: ["typescript", "preact"],
        publishedAt: "2024-01-15",
      };

      function Consumer() {
        const fm = useFrontmatter();
        return (
          <div
            data-author={fm.author as string}
            data-tags={(fm.tags as string[]).join(",")}
          />
        );
      }

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <Consumer />
        </FrontmatterProvider>,
      );

      expect(html).toContain('data-author="Jane Doe"');
      expect(html).toContain('data-tags="typescript,preact"');
    });

    it("should provide empty frontmatter object", () => {
      const frontmatter: Frontmatter = {};

      function Consumer() {
        const fm = useFrontmatter();
        return <div data-has-title={String(fm.title !== undefined)} />;
      }

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <Consumer />
        </FrontmatterProvider>,
      );

      expect(html).toContain('data-has-title="false"');
    });
  });

  describe("nested access", () => {
    it("should allow nested components to access same frontmatter", () => {
      const frontmatter: Frontmatter = {
        title: "Shared Title",
      };

      function DeepChild() {
        const fm = useFrontmatter();
        return <span>{fm.title}</span>;
      }

      function MiddleComponent() {
        const fm = useFrontmatter();
        return (
          <div data-middle-title={fm.title}>
            <DeepChild />
          </div>
        );
      }

      function TopComponent() {
        const fm = useFrontmatter();
        return (
          <section data-top-title={fm.title}>
            <MiddleComponent />
          </section>
        );
      }

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <TopComponent />
        </FrontmatterProvider>,
      );

      expect(html).toContain('data-top-title="Shared Title"');
      expect(html).toContain('data-middle-title="Shared Title"');
      expect(html).toContain("<span>Shared Title</span>");
    });

    it("should allow sibling components to access frontmatter", () => {
      const frontmatter: Frontmatter = {
        title: "Page Title",
        description: "Page description",
      };

      function TitleComponent() {
        const { title } = useFrontmatter();
        return <h1>{title}</h1>;
      }

      function DescriptionComponent() {
        const { description } = useFrontmatter();
        return <p>{description}</p>;
      }

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <TitleComponent />
          <DescriptionComponent />
        </FrontmatterProvider>,
      );

      expect(html).toContain("<h1>Page Title</h1>");
      expect(html).toContain("<p>Page description</p>");
    });
  });

  describe("children rendering", () => {
    it("should render children without consumers", () => {
      const frontmatter: Frontmatter = { title: "Test" };

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <div>Static content</div>
        </FrontmatterProvider>,
      );

      expect(html).toContain("<div>Static content</div>");
    });

    it("should render multiple children", () => {
      const frontmatter: Frontmatter = { title: "Test" };

      const html = render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <header>Header</header>
          <main>Main</main>
          <footer>Footer</footer>
        </FrontmatterProvider>,
      );

      expect(html).toContain("<header>Header</header>");
      expect(html).toContain("<main>Main</main>");
      expect(html).toContain("<footer>Footer</footer>");
    });
  });
});

describe("useFrontmatter", () => {
  describe("error handling", () => {
    it("should throw when used outside FrontmatterProvider", () => {
      function OrphanConsumer() {
        useFrontmatter();
        return <div />;
      }

      expect(() => render(<OrphanConsumer />)).toThrow(
        "useFrontmatter must be used within FrontmatterProvider",
      );
    });
  });

  describe("return value", () => {
    it("should return the exact frontmatter object reference", () => {
      const frontmatter: Frontmatter = {
        title: "Reference Test",
        nested: { deep: "value" },
      };

      let capturedFrontmatter: Frontmatter | null = null;

      function Consumer() {
        capturedFrontmatter = useFrontmatter();
        return <div />;
      }

      render(
        <FrontmatterProvider frontmatter={frontmatter}>
          <Consumer />
        </FrontmatterProvider>,
      );

      expect(capturedFrontmatter).toBe(frontmatter);
    });
  });
});

import type { ComponentType, JSX } from "preact";
import type { LoadedLayout, LoadedPage } from "../loaders/types.ts";
import {
  BasePathProvider,
  FrontmatterProvider,
  type MarkdownConfig,
  MarkdownConfigProvider,
} from "../preact/context.tsx";
import { Markdown } from "../preact/markdown.tsx";

/**
 * Options for composing a page tree.
 */
export interface ComposeTreeOptions {
  /** Base path prefix for the site. */
  basePath?: string;
  /** Markdown rendering configuration. */
  markdownConfig?: MarkdownConfig;
}

/**
 * Composes a page with its layout chain into a renderable component tree.
 *
 * The composition wraps the page content in layouts from innermost to outermost,
 * then wraps everything in context providers for frontmatter, basePath, and
 * markdown config access.
 *
 * For markdown pages, the content is wrapped in a Markdown component which
 * renders a marker for post-processing by processMarkdownMarkers().
 *
 * @param page - Loaded page (markdown or TSX)
 * @param layouts - Layout chain from root to innermost
 * @param options - Composition options
 * @returns A component that renders the complete tree
 *
 * @example
 * ```typescript
 * const Tree = composeTree(page, [rootLayout, blogLayout], { basePath: "/docs" });
 * const html = render(<Tree />);
 * ```
 */
export function composeTree(
  page: LoadedPage,
  layouts: LoadedLayout[],
  options: ComposeTreeOptions = {},
): ComponentType {
  const { basePath = "", markdownConfig = {} } = options;
  // Build page content - either TSX component or markdown wrapped in Markdown
  let content: JSX.Element;
  if (page.type === "tsx") {
    const PageComponent = page.component;
    content = <PageComponent />;
  } else {
    content = <Markdown>{page.content}</Markdown>;
  }

  // Wrap in layouts from innermost to outermost
  // layouts[0] is root, layouts[n-1] is innermost
  // We iterate in reverse so innermost wraps content first, then outer wraps that
  for (let i = layouts.length - 1; i >= 0; i--) {
    const Layout = layouts[i].component;
    content = <Layout>{content}</Layout>;
  }

  // Return a component that wraps everything in context providers
  const frontmatter = page.frontmatter;
  return function ComposedTree(): JSX.Element {
    return (
      <BasePathProvider basePath={basePath}>
        <MarkdownConfigProvider config={markdownConfig}>
          <FrontmatterProvider frontmatter={frontmatter}>
            {content}
          </FrontmatterProvider>
        </MarkdownConfigProvider>
      </BasePathProvider>
    );
  };
}

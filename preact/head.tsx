import type { ComponentChildren, JSX } from "preact";
import { createElement } from "preact";
import { render } from "preact-render-to-string";
import { escapeHtml } from "../utils/mod.ts";

/**
 * Props for the Head component.
 */
export interface HeadProps {
  /** Elements to inject into the document head (title, meta, link, etc). */
  children: ComponentChildren;
}

/**
 * Component for injecting content into the document `<head>`.
 *
 * On the server, renders a marker element containing the serialized head
 * content. The marker is extracted by `processHeadMarkers()` and injected
 * into the HTML document's `<head>` section.
 *
 * On the client, returns null as head content is already in the document.
 *
 * @example
 * ```tsx
 * import { Head } from "@tabirun/pages/preact";
 *
 * function Page() {
 *   return (
 *     <>
 *       <Head>
 *         <title>My Page</title>
 *         <meta name="description" content="Page description" />
 *       </Head>
 *       <main>Content</main>
 *     </>
 *   );
 * }
 * ```
 */
export function Head({ children }: HeadProps): JSX.Element | null {
  const isServer = typeof window === "undefined";
  if (!isServer) {
    return null;
  }

  const html = render(<>{children}</>);

  return createElement("tabi-head", {
    dangerouslySetInnerHTML: { __html: escapeHtml(html) },
  });
}

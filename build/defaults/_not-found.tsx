import type { JSX } from "preact";

/**
 * Frontmatter for the default 404 page.
 */
export const frontmatter = {
  title: "Page Not Found",
};

/**
 * Default 404 Not Found page component.
 * Used when user doesn't provide a custom _not-found.tsx.
 */
// deno-coverage-ignore-start -- component tested via factory in defaults.tsx; test fixtures use custom _not-found.tsx
export default function DefaultNotFound(): JSX.Element {
  return (
    <div>
      <h1>404</h1>
      <p>Page not found</p>
    </div>
  );
}
// deno-coverage-ignore-stop

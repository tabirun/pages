import type { JSX } from "preact";

/**
 * Frontmatter for the default error page.
 */
export const frontmatter = {
  title: "Error",
};

/**
 * Default error page component.
 * Used when user doesn't provide a custom _error.tsx.
 */
export default function DefaultError(): JSX.Element {
  return (
    <div>
      <h1>Error</h1>
      <p>
        Something went wrong
      </p>
    </div>
  );
}

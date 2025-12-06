import type { JSX } from "preact";

export const frontmatter = {
  title: 123, // Should be string
  description: true, // Should be string
};

export default function InvalidSchemaPage(): JSX.Element {
  return <h1>Invalid Schema</h1>;
}

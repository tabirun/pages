import type { JSX } from "preact";

export const frontmatter = {
  title: "Home",
  description: "Test homepage",
};

export default function HomePage(): JSX.Element {
  return (
    <div>
      <h1>Welcome Home</h1>
    </div>
  );
}

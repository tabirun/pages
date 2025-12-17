import { useState } from "@tabirun/pages/preact";

export const frontmatter = {
  title: "Markdown + TSX Example",
  description: "Mixing markdown and TSX pages",
};

export default function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Markdown + Preact Example</h1>
      <p>
        This example shows how to mix markdown (.md) and TSX (.tsx) pages in the
        same project.
      </p>

      <h2>Interactive Counter</h2>
      <p>TSX pages support full interactivity:</p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </button>

      <h2>Page Types</h2>
      <ul>
        <li>
          <strong>TSX pages</strong> - Full Preact components with interactivity
        </li>
        <li>
          <strong>Markdown pages</strong> - Simple content with frontmatter
        </li>
      </ul>
    </div>
  );
}

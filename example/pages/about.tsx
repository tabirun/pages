import { useState } from "preact/hooks";

export const frontmatter = {
  title: "About",
  description: "About this example site",
};

export default function AboutPage() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>About</h1>
      <p>
        This is an interactive TSX page. It demonstrates client-side hydration
        with Preact.
      </p>

      <h2>Interactive Counter</h2>
      <p>Click the button to increment the counter:</p>
      <p>
        <strong>Count: {count}</strong>
      </p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>

      <h2>How It Works</h2>
      <p>
        Pages are server-rendered to static HTML, then hydrated on the client
        for interactivity. This page uses Preact's useState hook to manage local
        state.
      </p>
    </>
  );
}

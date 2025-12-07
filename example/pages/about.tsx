import { useState } from "preact/hooks";

export const frontmatter = {
  title: "About",
  description: "About this example site",
};

export default function AboutPage() {
  const [count, setCount] = useState(0);

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">About</h1>
      <p class="text-gray-600">
        This is an interactive TSX page. It demonstrates client-side hydration
        with Preact.
      </p>

      <section class="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 class="text-xl font-semibold">Interactive Counter</h2>
        <p class="text-gray-600">Click the button to increment the counter:</p>
        <div class="flex items-center gap-4">
          <span class="text-2xl font-bold text-blue-600">{count}</span>
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Increment
          </button>
        </div>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">How It Works</h2>
        <p class="text-gray-600">
          Pages are server-rendered to static HTML, then hydrated on the client
          for interactivity. This page uses Preact's useState hook to manage
          local state.
        </p>
      </section>
    </div>
  );
}

import { useState } from "preact/hooks";

export default function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div class="p-md">
      <button type="button" onClick={() => setCount(count + 1)}>
        click me
      </button>
      {count > 0 && (
        <p class="m-sm text-sm text-secondary">Clicked {count} times</p>
      )}
      <h1 class="text-2xl font-bold text-primary">UnoCSS Example</h1>
      <p class="text-secondary m-sm">
        This example uses UnoCSS with custom rules only - no presets.
      </p>

      <div class="bg-light p-md rounded-lg shadow m-md">
        <h2 class="text-lg font-bold">Custom Utilities</h2>
        <p class="text-sm text-secondary">
          Define your own utility classes in uno.config.ts
        </p>
      </div>

      <div class="flex flex-col gap-sm m-md">
        <div class="p-sm bg-primary text-white rounded">
          Primary Button Style
        </div>
        <div class="p-sm bg-light text-secondary rounded">Secondary Style</div>
      </div>

      <p class="text-sm text-secondary text-center m-lg">
        Check uno.config.ts for the custom rule definitions.
      </p>
    </div>
  );
}

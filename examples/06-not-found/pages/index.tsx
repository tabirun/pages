export default function HomePage() {
  return (
    <div>
      <h1>Custom 404 Example</h1>
      <p>
        This example demonstrates how to create a custom 404 (not found) page.
      </p>
      <p>
        Click the "Broken Link" in the navigation to see the custom 404 page.
      </p>
      <h2>How It Works</h2>
      <p>
        Create a <code>_not-found.tsx</code>{" "}
        file in your pages directory. It will be used instead of the default 404
        page.
      </p>
      <pre
        style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "4px" }}
      >
{`pages/
  _layout.tsx      # Applied to 404 page too
  _not-found.tsx   # Custom 404 page
  index.tsx
  about.tsx`}
      </pre>
    </div>
  );
}

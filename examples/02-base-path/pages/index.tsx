import { useBasePath } from "../../../preact/mod.ts";

export default function HomePage() {
  const basePath = useBasePath();

  return (
    <div>
      <h1>Base Path Example</h1>
      <p>This site is configured to be served from a subpath.</p>
      <p>
        Current base path: <code>{basePath || "/"}</code>
      </p>
      <p>
        All links and assets are automatically prefixed with the base path.
      </p>
    </div>
  );
}

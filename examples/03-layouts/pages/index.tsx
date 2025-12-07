export default function HomePage() {
  return (
    <div>
      <h1>Nested Layouts Example</h1>
      <p>This example demonstrates how layouts can be nested hierarchically.</p>
      <ul>
        <li>
          <strong>Root Layout</strong>{" "}
          - Applied to all pages (header, footer, max-width)
        </li>
        <li>
          <strong>Blog Layout</strong>{" "}
          - Applied only to /blog/* pages (sidebar, blog-specific styling)
        </li>
      </ul>
      <p>
        Visit the <a href="/blog">blog section</a>{" "}
        to see the nested layout in action.
      </p>
    </div>
  );
}

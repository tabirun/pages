import type { JSX } from "preact";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

/**
 * Blog layout - wraps only pages in /blog/*.
 * Nested inside the root layout automatically.
 */
export default function BlogLayout({ children }: LayoutProps) {
  return (
    <div style={{ display: "flex", gap: "2rem" }}>
      <aside
        style={{
          width: "200px",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Blog Posts</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <a href="/blog">All Posts</a>
          </li>
          <li>
            <a href="/blog/first-post">First Post</a>
          </li>
          <li>
            <a href="/blog/second-post">Second Post</a>
          </li>
        </ul>
      </aside>
      <article style={{ flex: 1 }}>
        {children}
      </article>
    </div>
  );
}

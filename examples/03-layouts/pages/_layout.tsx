import type { JSX } from "preact";
import { Head } from "../../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

/**
 * Root layout - wraps all pages site-wide.
 * Provides the main navigation and site structure.
 */
export default function RootLayout({ children }: LayoutProps) {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "1rem",
      }}
    >
      <Head>
        <title>Layouts Example</title>
      </Head>
      <header
        style={{
          borderBottom: "1px solid #ccc",
          paddingBottom: "1rem",
          marginBottom: "1rem",
        }}
      >
        <nav>
          <a href="/">Home</a>
          {" | "}
          <a href="/blog">Blog</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer
        style={{
          borderTop: "1px solid #ccc",
          paddingTop: "1rem",
          marginTop: "2rem",
          color: "#666",
        }}
      >
        Site Footer - Root Layout
      </footer>
    </div>
  );
}

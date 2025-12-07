import type { JSX } from "preact";
import { Head, useFrontmatter } from "../../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

export default function RootLayout({ children }: LayoutProps) {
  const frontmatter = useFrontmatter();

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: "700px",
        margin: "0 auto",
        padding: "1rem",
      }}
    >
      <Head>
        <title>{frontmatter.title ?? "Markdown Example"}</title>
        {frontmatter.description && (
          <meta name="description" content={frontmatter.description} />
        )}
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
          <a href="/about">About (TSX)</a>
          {" | "}
          <a href="/docs">Docs (Markdown)</a>
          {" | "}
          <a href="/guide">Guide (Markdown)</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

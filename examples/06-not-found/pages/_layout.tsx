import type { JSX } from "preact";
import { Head } from "../../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "1rem",
      }}
    >
      <Head>
        <title>Custom 404 Example</title>
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
          <a href="/about">About</a>
          {" | "}
          <a href="/does-not-exist">Broken Link</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

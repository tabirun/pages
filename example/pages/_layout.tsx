import type { JSX } from "preact";
import { Head, useBasePath, useFrontmatter } from "../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

export default function RootLayout({ children }: LayoutProps) {
  const frontmatter = useFrontmatter();
  const basePath = useBasePath();

  return (
    <>
      <Head>
        <title>{frontmatter.title ?? "Example Site"}</title>
        {frontmatter.description && (
          <meta name="description" content={frontmatter.description} />
        )}
        <style>
          {`
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
            header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
            nav { display: flex; gap: 1rem; }
            nav a { color: #0066cc; text-decoration: none; }
            nav a:hover { text-decoration: underline; }
            main { min-height: 60vh; }
            footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem; }
            h1 { margin-bottom: 1rem; }
            p { margin-bottom: 1rem; }
            button { padding: 0.5rem 1rem; cursor: pointer; }
          `}
        </style>
      </Head>
      <header>
        <nav>
          <a href={`${basePath}/`}>Home</a>
          <a href={`${basePath}/about`}>About</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>Built with Tabirun Pages</footer>
    </>
  );
}

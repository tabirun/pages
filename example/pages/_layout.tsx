import type { JSX } from "preact";
import { Head, useBasePath, useFrontmatter } from "../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

export default function RootLayout({ children }: LayoutProps) {
  const frontmatter = useFrontmatter();
  const basePath = useBasePath();

  return (
    <div>
      <Head>
        <title>{frontmatter.title ?? "Example Site"}</title>
        {frontmatter.description && (
          <meta name="description" content={frontmatter.description} />
        )}
      </Head>
      <header>
        <nav>
          <a href={`${basePath}/`}>
            Home
          </a>
          <a href={`${basePath}/about`}>
            About
          </a>
        </nav>
      </header>
      <main>
        {children}
      </main>
      <footer>
        <div>
          Built with Tabirun Pages
        </div>
      </footer>
    </div>
  );
}

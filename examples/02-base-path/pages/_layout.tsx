import type { JSX } from "preact";
import { Head, useBasePath } from "../../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

export default function RootLayout({ children }: LayoutProps) {
  const basePath = useBasePath();

  return (
    <div>
      <Head>
        <title>Base Path Example</title>
      </Head>
      <header>
        <nav>
          {/* Use basePath for all internal links */}
          <a href={`${basePath}/`}>Home</a>
          {" | "}
          <a href={`${basePath}/about`}>About</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

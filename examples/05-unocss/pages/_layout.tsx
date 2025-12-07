import type { JSX } from "preact";
import { Head } from "../../../preact/mod.ts";

interface LayoutProps {
  children: JSX.Element | JSX.Element[];
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div class="max-w-lg mx-auto p-md">
      <Head>
        <title>UnoCSS Example</title>
      </Head>
      <header class="p-sm bg-light rounded-lg m-sm">
        <nav class="flex gap-md">
          <a href="/" class="text-primary">Home</a>
          <a href="/demo" class="text-primary">Demo</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

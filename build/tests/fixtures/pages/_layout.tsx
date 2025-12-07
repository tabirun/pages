import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div className="root-layout">
      <header>Site Header</header>
      <main>{children}</main>
      <footer>Site Footer</footer>
    </div>
  );
}

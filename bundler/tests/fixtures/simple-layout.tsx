import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function SimpleLayout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header>Header</header>
      <main>{children}</main>
      <footer>Footer</footer>
    </div>
  );
}

import type { ComponentChildren, JSX } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function ValidLayout({ children }: LayoutProps): JSX.Element {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}

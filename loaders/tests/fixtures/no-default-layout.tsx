import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export function NamedLayout({ children }: LayoutProps): void {
  // This file has no default export
  void children;
}

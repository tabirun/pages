import type { ComponentChildren } from "preact";

interface DocumentProps {
  head: ComponentChildren;
  children: ComponentChildren;
}

export function NamedDocument({ head, children }: DocumentProps): void {
  // This file has no default export
  void head;
  void children;
}

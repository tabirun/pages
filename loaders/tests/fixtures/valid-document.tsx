import type { ComponentChildren, JSX } from "preact";

interface DocumentProps {
  head: ComponentChildren;
  children: ComponentChildren;
}

export default function ValidDocument(
  { head, children }: DocumentProps,
): JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        {head}
      </head>
      <body>{children}</body>
    </html>
  );
}

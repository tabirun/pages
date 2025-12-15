import type { ComponentChildren, JSX } from "preact";

interface DocumentProps {
  head: ComponentChildren;
  children: ComponentChildren;
}

export default function CustomDocument(
  { head, children }: DocumentProps,
): JSX.Element {
  return (
    <html lang="en" data-testid="custom-document">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="custom-meta" content="from-html-template" />
        {head}
      </head>
      <body className="custom-body-class">{children}</body>
    </html>
  );
}

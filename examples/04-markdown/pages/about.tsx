export const frontmatter = {
  title: "About",
  description: "About this example",
};

export default function AboutPage() {
  return (
    <div>
      <h1>About</h1>
      <p>
        This is a TSX page. TSX pages export a default component and optionally
        a <code>frontmatter</code> object for metadata.
      </p>
      <pre>
{`export const frontmatter = {
  title: "About",
  description: "About this example",
};

export default function AboutPage() {
  return <div>...</div>;
}`}
      </pre>
    </div>
  );
}

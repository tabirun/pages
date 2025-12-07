export default function SecondPostPage() {
  return (
    <div>
      <h1>Second Post</h1>
      <p>
        <em>Published: 2024-01-20</em>
      </p>
      <p>
        Another blog post demonstrating the nested layout system. Each
        _layout.tsx file in the hierarchy is automatically applied.
      </p>
      <h2>How It Works</h2>
      <ul>
        <li>
          <code>pages/_layout.tsx</code> - Applied to all pages
        </li>
        <li>
          <code>pages/blog/_layout.tsx</code> - Applied to all /blog/* pages
        </li>
      </ul>
    </div>
  );
}

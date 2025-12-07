export default function FirstPostPage() {
  return (
    <div>
      <h1>First Post</h1>
      <p>
        <em>Published: 2024-01-15</em>
      </p>
      <p>
        This is the first blog post. Notice how it inherits both the root layout
        (with the main navigation and footer) and the blog layout (with the
        sidebar).
      </p>
      <p>
        The layout chain is: Root Layout → Blog Layout → Page Content
      </p>
    </div>
  );
}

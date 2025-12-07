export default function BlogIndexPage() {
  return (
    <div>
      <h1>Blog</h1>
      <p>Welcome to the blog section. This page uses both layouts:</p>
      <ol>
        <li>Root layout (header, footer, max-width container)</li>
        <li>Blog layout (sidebar with navigation)</li>
      </ol>
      <h2>Recent Posts</h2>
      <ul>
        <li>
          <a href="/blog/first-post">First Post</a> - Getting started
        </li>
        <li>
          <a href="/blog/second-post">Second Post</a> - Going deeper
        </li>
      </ul>
    </div>
  );
}

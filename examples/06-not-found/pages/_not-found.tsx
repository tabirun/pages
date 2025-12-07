export default function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1 style={{ fontSize: "4rem", margin: "0", color: "#e11d48" }}>404</h1>
      <h2 style={{ marginTop: "0.5rem" }}>Page Not Found</h2>
      <p style={{ color: "#666" }}>
        Sorry, the page you're looking for doesn't exist.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Go Home
        </a>
      </div>
      <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#999" }}>
        This is a custom 404 page defined in <code>_not-found.tsx</code>
      </p>
    </div>
  );
}

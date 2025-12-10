export default function HomePage() {
  return (
    <div>
      <h1>CLI Usage Example</h1>
      <p>This site was built using the Tabi Pages CLI commands.</p>
      <p>No wrapper scripts required - just run directly via JSR:</p>
      <pre>
        <code>deno run jsr:@tabirun/pages/build</code>
      </pre>
    </div>
  );
}

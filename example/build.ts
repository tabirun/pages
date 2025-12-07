import { pages } from "@tabirun/pages";

const { build } = pages({
  siteMetadata: {
    baseUrl: "https://example.com",
  },
});

await build({
  pagesDir: "./pages",
  outDir: "./dist",
});

console.log("Build complete!");

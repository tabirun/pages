import { pages } from "../pages/mod.ts";

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

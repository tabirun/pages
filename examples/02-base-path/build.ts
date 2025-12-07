import { pages } from "../../pages/mod.ts";

// Configure basePath for hosting at /docs subpath
const { build } = pages({
  basePath: "/docs",
  siteMetadata: {
    baseUrl: "https://example.com",
  },
});

await build({
  pagesDir: "./pages",
  outDir: "./dist",
});

console.log("Build complete!");

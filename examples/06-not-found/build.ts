import { pages } from "../../pages/mod.ts";

const { build } = pages();

await build({
  pagesDir: "./pages",
  outDir: "./dist",
});

console.log("Build complete!");

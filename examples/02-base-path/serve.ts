import { TabiApp } from "@tabirun/app";
import { pages } from "../../pages/mod.ts";

const app = new TabiApp();

// Must use same basePath as build
const { serve } = pages({
  basePath: "/docs",
});

serve(app, {
  dir: "./dist",
});

const port = 3000;
console.log(`Server running at http://localhost:${port}/docs`);
Deno.serve({ port }, app.handler);

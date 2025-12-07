import { TabiApp } from "@tabirun/app";
import { pages } from "../../pages/mod.ts";

const app = new TabiApp();

const { serve } = pages();

serve(app, {
  dir: "./dist",
});

const port = 3000;
console.log(`Server running at http://localhost:${port}`);
Deno.serve({ port }, app.handler);

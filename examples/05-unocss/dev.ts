import { TabiApp } from "@tabirun/app";
import { pages } from "../../pages/mod.ts";

const app = new TabiApp();

const { dev } = pages();

await dev(app, {
  pagesDir: "./pages",
});

Deno.serve({ port: 3000, onListen: () => {} }, app.handler);

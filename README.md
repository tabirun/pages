<p align="center" style="color: #343a40">
  <h1 align="center">Tabi Pages</h1>
</p>
<p align="center">
  <strong>Build Tabi powered web apps with Markdown and Preact.</strong>
</p>

<p align="center">
  <a href="https://jsr.io/@tabirun/pages"><img src="https://jsr.io/badges/@tabirun/pages" alt="JSR"></a>
  <a href="https://github.com/tabirun/pages/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>
<p align="center" style="color: #343a40">
  <img src="./assets/mascot-readme.png" alt="Tabi Mascot" width="200"/>
</p>

## Quick Start

```bash
deno add jsr:@tabirun/app jsr:@tabirun/pages
```

**deno.json**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@tabirun/pages/preact"
  },
  "imports": {
    "@tabirun/app": "jsr:@tabirun/app@^0.1.2",
    "@tabirun/pages": "jsr:@tabirun/pages@^0.6.0",
    "postcss": "npm:postcss@^8.4.49"
  }
}
```

**postcss.config.ts**

```typescript
import type { Config } from "postcss";

export default { plugins: [] } satisfies Config;
```

**styles/index.css**

```css
body {
  font-family: system-ui, sans-serif;
}
```

**pages/index.md**

```markdown
# Hello, Tabi Pages!
```

**dev.ts**

```typescript
import { TabiApp } from "@tabirun/app";
import { pages } from "@tabirun/pages";

const app = new TabiApp();
const { dev } = pages({ css: { entry: "./styles/index.css" } });
await dev(app);

Deno.serve({ port: 3000 }, app.handler);
```

**build.ts**

```typescript
import { pages } from "@tabirun/pages";

const { build } = pages({ css: { entry: "./styles/index.css" } });
await build();
```

**serve.ts**

```typescript
import { TabiApp } from "@tabirun/app";
import { pages } from "@tabirun/pages";

const app = new TabiApp();
const { serve } = pages();
serve(app);

Deno.serve({ port: 3000 }, app.handler);
```

```bash
deno run -A dev.ts    # Development with hot reload
deno run -A build.ts  # Build to ./dist
deno run -A serve.ts  # Serve ./dist
```

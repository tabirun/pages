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

> Tabi (旅) means "journey" in Japanese. The shortest path between two points is
> a straight line. Tabi stays out of your way—no abstractions to fight, no magic
> to reverse-engineer, no surprises in production. Every build should be a
> stress free journey.

## Quick Start

```bash
deno add jsr:@tabirun/app jsr:@tabirun/pages npm:preact npm:preact-render-to-string
```

Add to `deno.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

Create `dev.ts`:

```typescript
import { TabiApp } from "@tabirun/app";
import { pages } from "@tabirun/pages";

const app = new TabiApp();

const { dev } = pages();
await dev(app);

Deno.serve({ port: 3000 }, app.handler);
```

Create a `pages/` directory and add `index.md`:

```markdown
---
title: Hello, Tabi Pages!
---

# Hello, Tabi Pages!
```

Run the development server:

```bash
deno run --allow-all dev.ts
```

## CLI Commands

Tabi Pages can also be run directly via JSR without creating wrapper scripts.

### Build

Build a static site from your pages:

```bash
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build
```

Options:

| Option        | Short | Default   | Description                                                   |
| ------------- | ----- | --------- | ------------------------------------------------------------- |
| `--pages-dir` | `-p`  | `./pages` | Directory containing page files                               |
| `--out-dir`   | `-o`  | `./dist`  | Output directory for built files                              |
| `--base-path` |       |           | Base path for hosting at a subpath (e.g., `/docs`)            |
| `--base-url`  |       |           | Base URL for sitemap generation (e.g., `https://example.com`) |
| `--help`      | `-h`  |           | Show help message                                             |

### Serve

Serve a pre-built static site:

```bash
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve
```

Options:

| Option        | Short | Default  | Description                                        |
| ------------- | ----- | -------- | -------------------------------------------------- |
| `--dir`       | `-d`  | `./dist` | Directory containing built files to serve          |
| `--port`      | `-p`  | `3000`   | Port to listen on                                  |
| `--base-path` |       |          | Base path for hosting at a subpath (e.g., `/docs`) |
| `--help`      | `-h`  |          | Show help message                                  |

### Dev (Coming Soon)

The development server with hot reload is not yet implemented. Use `build` and
`serve` for now:

```bash
deno run --allow-all jsr:@tabirun/pages/dev --help
```

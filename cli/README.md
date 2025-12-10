# Tabi Pages CLI

Command-line interface for building and serving Tabi Pages sites directly via
JSR.

## Commands

### build

Build a static site from your pages directory.

```bash
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build [OPTIONS]
```

**Options:**

| Option        | Short | Default   | Description                                        |
| ------------- | ----- | --------- | -------------------------------------------------- |
| `--pages-dir` | `-p`  | `./pages` | Directory containing page files                    |
| `--out-dir`   | `-o`  | `./dist`  | Output directory for built files                   |
| `--base-path` |       |           | Base path for hosting at a subpath (e.g., `/docs`) |
| `--base-url`  |       |           | Base URL for sitemap (e.g., `https://example.com`) |
| `--help`      | `-h`  |           | Show help message                                  |

**Examples:**

```bash
# Build with defaults
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build

# Build to custom output directory
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build --out-dir ./public

# Build with base path for subdirectory hosting
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build --base-path /docs
```

### serve

Serve a pre-built static site.

```bash
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve [OPTIONS]
```

**Options:**

| Option        | Short | Default  | Description                                        |
| ------------- | ----- | -------- | -------------------------------------------------- |
| `--dir`       | `-d`  | `./dist` | Directory containing built files to serve          |
| `--port`      | `-p`  | `3000`   | Port to listen on                                  |
| `--base-path` |       |          | Base path for hosting at a subpath (e.g., `/docs`) |
| `--help`      | `-h`  |          | Show help message                                  |

**Examples:**

```bash
# Serve with defaults (./dist on port 3000)
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve

# Serve on custom port
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve --port 8080

# Serve from custom directory
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve --dir ./public
```

### dev (Coming Soon)

Development server with hot reload. Not yet implemented.

```bash
deno run --allow-all jsr:@tabirun/pages/dev --help
```

Use `build` and `serve` commands for now.

## Permissions

Each command requires specific Deno permissions:

| Command | Permissions                                          |
| ------- | ---------------------------------------------------- |
| build   | `--allow-read --allow-write --allow-env --allow-run` |
| serve   | `--allow-net --allow-read --allow-env`               |
| dev     | `--allow-all`                                        |

## Programmatic API

For more control, use the programmatic API instead:

```typescript
import { pages } from "@tabirun/pages";

const { build, serve } = pages({
  basePath: "/docs",
  siteMetadata: { baseUrl: "https://example.com" },
});

// Build
await build({ pagesDir: "./pages", outDir: "./dist" });

// Serve (requires TabiApp)
import { TabiApp } from "@tabirun/app";
const app = new TabiApp();
serve(app, { dir: "./dist" });
Deno.serve({ port: 3000 }, app.handler);
```

# CLI Usage Example

This example demonstrates using Tabi Pages CLI commands directly via JSR without
creating wrapper scripts.

## Structure

```
07-cli-usage/
├── README.md
├── pages/
│   └── index.tsx
└── dist/           # Created by build command
```

## Usage

### Build

Build the site to `./dist`:

```bash
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build
```

### Serve

Serve the built site:

```bash
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve
```

Then visit http://localhost:3000

### Build and Serve

Build then serve in sequence:

```bash
deno run --allow-read --allow-write --allow-env --allow-run jsr:@tabirun/pages/build && \
deno run --allow-net --allow-read --allow-env jsr:@tabirun/pages/serve
```

## Options

See `--help` for available options:

```bash
deno run jsr:@tabirun/pages/build --help
deno run jsr:@tabirun/pages/serve --help
```

## Comparison with Programmatic API

This example uses CLI commands directly. For the programmatic API equivalent,
see `examples/01-minimal/`.

| Approach     | Use Case                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| CLI          | Quick builds, CI/CD pipelines, no custom logic needed                    |
| Programmatic | Custom build steps, integration with other tools, advanced configuration |

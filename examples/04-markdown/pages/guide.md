---
title: Getting Started Guide
description: How to get started with Tabirun Pages
author: Tabirun Team
---

# Getting Started Guide

Welcome to Tabirun Pages! This guide will help you get started.

## Installation

Run the build script:

```bash
deno run -A build.ts
```

## Serve

Start the development server:

```bash
deno run -A serve.ts
```

## File Structure

```
project/
  pages/
    _layout.tsx     # Root layout (optional)
    index.tsx       # Home page
    about.md        # Markdown page
  build.ts
  serve.ts
```

## Tips

1. Use `.tsx` for interactive pages
2. Use `.md` for content-focused pages
3. Both support frontmatter for metadata

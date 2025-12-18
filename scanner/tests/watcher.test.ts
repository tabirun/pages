import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path";
import { delay } from "@std/async";
import { watchPages } from "../watcher.ts";
import type { FileChangeEvent } from "../types.ts";

// Helper to collect events with timeout
async function collectEvents(
  rootDir: string,
  operation: () => Promise<void>,
  options?: { debounceMs?: number; waitMs?: number },
): Promise<FileChangeEvent[]> {
  const events: FileChangeEvent[] = [];
  const debounceMs = options?.debounceMs ?? 50;
  const waitMs = options?.waitMs ?? 200;

  const handle = watchPages(
    { rootDir, debounceMs },
    (event) => events.push(event),
  );

  // Give watcher time to start
  await delay(50);

  try {
    await operation();
    // Wait for debounce + processing
    await delay(waitMs);
  } finally {
    handle.stop();
  }

  return events;
}

describe("watchPages", () => {
  // Note: macOS FSEvents may report "modify" instead of "create" for new files.
  // Tests focus on category and route correctness rather than exact event types.

  describe("page changes", () => {
    it("should emit event for new page with correct category and route", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "index.md"),
            "# Hello",
          );
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
        const pageEvent = events.find((e) => e.category === "page");
        expect(pageEvent).toBeDefined();
        expect(pageEvent!.category).toBe("page");
        expect(pageEvent!.route).toBe("/");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit event for modified page", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "about.md"), "# About");

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "about.md"),
            "# Updated",
          );
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
        const pageEvent = events.find((e) => e.category === "page");
        expect(pageEvent).toBeDefined();
        expect(pageEvent!.route).toBe("/about");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit event for removed page", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(
          join(tempDir, "pages", "contact.md"),
          "# Contact",
        );

        const events = await collectEvents(tempDir, async () => {
          await Deno.remove(join(tempDir, "pages", "contact.md"));
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
        const pageEvent = events.find((e) => e.category === "page");
        expect(pageEvent).toBeDefined();
        expect(pageEvent!.route).toBe("/contact");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit event for renamed page", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(
          join(tempDir, "pages", "old-name.md"),
          "# Old",
        );

        const events = await collectEvents(tempDir, async () => {
          await Deno.rename(
            join(tempDir, "pages", "old-name.md"),
            join(tempDir, "pages", "new-name.md"),
          );
        });

        // Rename may trigger multiple events (remove old, create new, or rename)
        expect(events.length).toBeGreaterThanOrEqual(1);
        const pageEvent = events.find((e) => e.category === "page");
        expect(pageEvent).toBeDefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should include route for nested pages", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages", "blog"), { recursive: true });

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "blog", "post.md"),
            "# Post",
          );
        });

        const pageEvent = events.find((e) => e.category === "page");
        expect(pageEvent).toBeDefined();
        expect(pageEvent!.route).toBe("/blog/post");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("layout changes", () => {
    it("should emit layout event for _layout.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "_layout.tsx"),
            "export default () => null;",
          );
        });

        const layoutEvent = events.find((e) => e.category === "layout");
        expect(layoutEvent).toBeDefined();
        expect(layoutEvent!.category).toBe("layout");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("system file changes", () => {
    it("should emit system event for _html.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "_html.tsx"),
            "export default () => null;",
          );
        });

        const systemEvent = events.find((e) => e.category === "system");
        expect(systemEvent).toBeDefined();
        expect(systemEvent!.category).toBe("system");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit system event for _not-found.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "_not-found.tsx"),
            "export default () => null;",
          );
        });

        const systemEvent = events.find((e) => e.category === "system");
        expect(systemEvent).toBeDefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit system event for _error.tsx", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "_error.tsx"),
            "export default () => null;",
          );
        });

        const systemEvent = events.find((e) => e.category === "system");
        expect(systemEvent).toBeDefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("postcss.config.ts changes", () => {
    it("should emit postcssConfig event for postcss.config.ts", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        // Create the file first so the watcher can start watching it
        await Deno.writeTextFile(
          join(tempDir, "postcss.config.ts"),
          "export default {};",
        );

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "postcss.config.ts"),
            "export default { plugins: [] };",
          );
        });

        const postcssEvent = events.find((e) => e.category === "postcssConfig");
        expect(postcssEvent).toBeDefined();
        expect(postcssEvent!.category).toBe("postcssConfig");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("public asset changes", () => {
    it("should emit publicAsset event for new asset", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "public"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "public", "favicon.ico"),
            "icon",
          );
        });

        // Find asset event with route (not directory event)
        const assetEvent = events.find(
          (e) => e.category === "publicAsset" && e.route !== undefined,
        );
        expect(assetEvent).toBeDefined();
        expect(assetEvent!.category).toBe("publicAsset");
        expect(assetEvent!.route).toBe("/favicon.ico");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should include route for nested public assets", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "public", "images"), {
          recursive: true,
        });

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "public", "images", "logo.png"),
            "png",
          );
        });

        // Find asset event for the actual file (has extension in route)
        const assetEvent = events.find(
          (e) =>
            e.category === "publicAsset" &&
            e.route !== undefined &&
            e.filePath.endsWith("logo.png"),
        );
        expect(assetEvent).toBeDefined();
        expect(assetEvent!.route).toBe("/images/logo.png");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("code changes", () => {
    it("should emit code event for private tsx files", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "_utils.tsx"),
            "export const util = () => {};",
          );
        });

        const codeEvent = events.find((e) => e.category === "code");
        expect(codeEvent).toBeDefined();
        expect(codeEvent!.category).toBe("code");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit code event for ts files", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "pages", "utils.ts"),
            "export const util = () => {};",
          );
        });

        const codeEvent = events.find((e) => e.category === "code");
        expect(codeEvent).toBeDefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should emit code event for files outside pages directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "components"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "components", "Button.tsx"),
            "export const Button = () => null;",
          );
        });

        const codeEvent = events.find(
          (e) => e.category === "code" && e.filePath.includes("Button.tsx"),
        );
        expect(codeEvent).toBeDefined();
        expect(codeEvent!.category).toBe("code");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("debouncing", () => {
    it("should debounce rapid changes to same file", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.writeTextFile(join(tempDir, "pages", "test.md"), "# Test");

        const events = await collectEvents(
          tempDir,
          async () => {
            // Rapid writes
            await Deno.writeTextFile(
              join(tempDir, "pages", "test.md"),
              "# Update 1",
            );
            await delay(10);
            await Deno.writeTextFile(
              join(tempDir, "pages", "test.md"),
              "# Update 2",
            );
            await delay(10);
            await Deno.writeTextFile(
              join(tempDir, "pages", "test.md"),
              "# Update 3",
            );
          },
          { debounceMs: 100, waitMs: 300 },
        );

        // Should only get one event due to debouncing (may get directory events too)
        const pageEvents = events.filter((e) => e.category === "page");
        expect(pageEvents.length).toBe(1);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("stop handle", () => {
    it("should stop watching when handle.stop() is called", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events: FileChangeEvent[] = [];
        const handle = watchPages(
          { rootDir: tempDir, debounceMs: 10 },
          (event) => events.push(event),
        );

        await delay(50);
        handle.stop();

        // Changes after stop should not trigger events
        await Deno.writeTextFile(join(tempDir, "pages", "after.md"), "# After");
        await delay(100);

        // Filter out any events that happened before stop
        const afterStopEvents = events.filter((e) =>
          e.filePath.includes("after.md")
        );
        expect(afterStopEvents.length).toBe(0);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("missing directories", () => {
    it("should handle missing pages directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        // No pages directory - should not throw
        const events: FileChangeEvent[] = [];
        const handle = watchPages(
          { rootDir: tempDir },
          (event) => events.push(event),
        );

        await delay(100);
        handle.stop();

        // Should complete without error
        expect(events.length).toBe(0);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should handle missing public directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        // No public directory - should not throw

        const events: FileChangeEvent[] = [];
        const handle = watchPages(
          { rootDir: tempDir },
          (event) => events.push(event),
        );

        await delay(100);
        handle.stop();

        // Should complete without error
        expect(events.length).toBe(0);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("custom directories", () => {
    it("should use custom pagesDir", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "src", "routes"), { recursive: true });

        const customEvents: FileChangeEvent[] = [];
        const handle = watchPages(
          { rootDir: tempDir, pagesDir: "src/routes", debounceMs: 50 },
          (event) => customEvents.push(event),
        );

        await delay(50);
        await Deno.writeTextFile(
          join(tempDir, "src", "routes", "about.md"),
          "# About",
        );
        await delay(200);
        handle.stop();

        const pageEvent = customEvents.find((e) => e.category === "page");
        expect(pageEvent).toBeDefined();
        expect(pageEvent!.route).toBe("/about");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should use custom publicDir", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "static"));

        const events: FileChangeEvent[] = [];
        const handle = watchPages(
          { rootDir: tempDir, publicDir: "static", debounceMs: 50 },
          (event) => events.push(event),
        );

        await delay(50);
        await Deno.writeTextFile(
          join(tempDir, "static", "robots.txt"),
          "User-agent: *",
        );
        await delay(200);
        handle.stop();

        // Find asset event with route (not directory event)
        const assetEvent = events.find(
          (e) => e.category === "publicAsset" && e.route !== undefined,
        );
        expect(assetEvent).toBeDefined();
        expect(assetEvent!.route).toBe("/robots.txt");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("ignored directories", () => {
    it("should ignore changes in node_modules", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "node_modules", "some-pkg"), {
          recursive: true,
        });

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "node_modules", "some-pkg", "index.js"),
            "module.exports = {};",
          );
        });

        const nodeModulesEvent = events.find((e) =>
          e.filePath.includes("node_modules")
        );
        expect(nodeModulesEvent).toBeUndefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should ignore changes in dist directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "dist"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "dist", "bundle.js"),
            "// compiled output",
          );
        });

        const distEvent = events.find((e) => e.filePath.includes("dist"));
        expect(distEvent).toBeUndefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should ignore changes in coverage directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "coverage"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, "coverage", "lcov.info"),
            "// coverage data",
          );
        });

        const coverageEvent = events.find((e) =>
          e.filePath.includes("coverage")
        );
        expect(coverageEvent).toBeUndefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should ignore changes in hidden directories", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, ".cache"));

        const events = await collectEvents(tempDir, async () => {
          await Deno.writeTextFile(
            join(tempDir, ".cache", "data.json"),
            "{}",
          );
        });

        const hiddenEvent = events.find((e) => e.filePath.includes(".cache"));
        expect(hiddenEvent).toBeUndefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should ignore non-TypeScript files outside pages/public", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));
        await Deno.mkdir(join(tempDir, "config"));

        const events = await collectEvents(tempDir, async () => {
          // These should be ignored (not TypeScript)
          await Deno.writeTextFile(
            join(tempDir, "config", "settings.json"),
            "{}",
          );
          await Deno.writeTextFile(
            join(tempDir, "README.md"),
            "# Readme",
          );
        });

        const jsonEvent = events.find((e) =>
          e.filePath.includes("settings.json")
        );
        const mdEvent = events.find((e) => e.filePath.includes("README.md"));
        expect(jsonEvent).toBeUndefined();
        expect(mdEvent).toBeUndefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should ignore non-TypeScript files in pages directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "pages"));

        const events = await collectEvents(tempDir, async () => {
          // CSS file should be ignored (not a page, layout, system, or TypeScript)
          await Deno.writeTextFile(
            join(tempDir, "pages", "styles.css"),
            "body { color: red; }",
          );
        });

        const cssEvent = events.find((e) => e.filePath.includes("styles.css"));
        expect(cssEvent).toBeUndefined();
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });
});

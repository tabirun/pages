import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { dirname, fromFileUrl, join } from "@std/path";
import { handleError, handleNotFound, handlePageRequest } from "../handlers.ts";
import { createHotReloadServer } from "../hot-reload.ts";
import type { DevServerState } from "../types.ts";
import type { PageManifest } from "../../scanner/types.ts";

const TEST_DIR = dirname(fromFileUrl(import.meta.url));
const FIXTURES_DIR = join(TEST_DIR, "fixtures");
const PREACT_DIR = join(dirname(TEST_DIR), "../preact");

function createTestState(
  manifest: PageManifest | null = null,
  basePath = "",
): DevServerState {
  return {
    manifest,
    hotReload: createHotReloadServer(),
    watchHandle: null,
    rootDir: FIXTURES_DIR,
    pagesDir: "pages",
    publicDir: "public",
    basePath,
    preactDir: PREACT_DIR,
  };
}

function createEmptyManifest(): PageManifest {
  return {
    pages: [],
    layouts: [],
    systemFiles: {
      html: null,
      notFound: null,
      error: null,
      unoConfig: null,
    },
    publicAssets: [],
  };
}

describe(
  "handlePageRequest",
  { sanitizeResources: false, sanitizeOps: false },
  () => {
    describe("when manifest is null", () => {
      it("should return 503 with error overlay", async () => {
        const state = createTestState(null);
        const result = await handlePageRequest("/", state);

        expect(result.status).toBe(503);
        expect(result.html).toContain("Page manifest not available");
        expect(result.html).toContain("__hot-reload");
      });
    });

    describe("when page not found", () => {
      it("should return 404 with framework not-found page", async () => {
        const state = createTestState(createEmptyManifest());
        const result = await handlePageRequest("/nonexistent", state);

        expect(result.status).toBe(404);
        // Should render the default not-found page content
        expect(result.html).toContain("404");
        expect(result.html).toContain("__hot-reload");
        expect(result.html).toContain("__tabi__");
      });
    });

    describe("when page exists", () => {
      it("should render TSX page with hot reload script", async () => {
        const state = createTestState({
          ...createEmptyManifest(),
          pages: [
            {
              filePath: join(FIXTURES_DIR, "simple-page.tsx"),
              route: "/simple",
              type: "tsx",
              layoutChain: [],
            },
          ],
        });

        const result = await handlePageRequest("/simple", state);

        expect(result.status).toBe(200);
        expect(result.html).toContain("<!DOCTYPE html>");
        expect(result.html).toContain("__hot-reload");
        expect(result.html).toContain("__tabi__");
        expect(result.html).toContain("__TABI_DATA__");
      });

      it("should render page with layout", async () => {
        const layoutPath = join(FIXTURES_DIR, "simple-layout.tsx");
        const state = createTestState({
          ...createEmptyManifest(),
          pages: [
            {
              filePath: join(FIXTURES_DIR, "simple-page.tsx"),
              route: "/with-layout",
              type: "tsx",
              layoutChain: [layoutPath],
            },
          ],
          layouts: [
            {
              filePath: layoutPath,
              directory: FIXTURES_DIR,
            },
          ],
        });

        const result = await handlePageRequest("/with-layout", state);

        expect(result.status).toBe(200);
        expect(result.html).toContain("<!DOCTYPE html>");
      });

      it("should include basePath in hot reload script", async () => {
        const state = createTestState(
          {
            ...createEmptyManifest(),
            pages: [
              {
                filePath: join(FIXTURES_DIR, "simple-page.tsx"),
                route: "/simple",
                type: "tsx",
                layoutChain: [],
              },
            ],
          },
          "/docs",
        );

        const result = await handlePageRequest("/simple", state);

        expect(result.status).toBe(200);
        expect(result.html).toContain("/docs/__hot-reload");
      });
    });

    describe("error handling", () => {
      it("should return error overlay on SSR failure", async () => {
        const state = createTestState({
          ...createEmptyManifest(),
          pages: [
            {
              filePath: join(FIXTURES_DIR, "nonexistent-page.tsx"),
              route: "/broken",
              type: "tsx",
              layoutChain: [],
            },
          ],
        });

        const result = await handlePageRequest("/broken", state);

        expect(result.status).toBe(500);
        expect(result.html).toContain("Build Error");
        expect(result.html).toContain("__hot-reload");
      });
    });
  },
);

describe(
  "handleNotFound",
  { sanitizeResources: false, sanitizeOps: false },
  () => {
    it("should return 404 status", async () => {
      const state = createTestState(createEmptyManifest());
      const result = await handleNotFound(state);

      expect(result.status).toBe(404);
    });

    it("should render default not-found page through SSR", async () => {
      const state = createTestState(createEmptyManifest());
      const result = await handleNotFound(state);

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("404");
      expect(result.html).toContain("__tabi__");
      expect(result.html).toContain("__TABI_DATA__");
    });

    it("should include hot reload script", async () => {
      const state = createTestState(createEmptyManifest());
      const result = await handleNotFound(state);

      expect(result.html).toContain("__hot-reload");
      expect(result.html).toContain("WebSocket");
    });

    it("should include basePath in hot reload script", async () => {
      const state = createTestState(createEmptyManifest(), "/my-app");
      const result = await handleNotFound(state);

      expect(result.html).toContain("/my-app/__hot-reload");
    });

    it("should return 503 when manifest is null", async () => {
      const state = createTestState(null);
      const result = await handleNotFound(state);

      expect(result.status).toBe(503);
      expect(result.html).toContain("Page manifest not available");
    });

    it("should use custom not-found page when available", async () => {
      // Create a custom not-found page in fixtures
      const customNotFoundPath = join(FIXTURES_DIR, "custom-not-found.tsx");

      // Write a temporary custom not-found file
      await Deno.writeTextFile(
        customNotFoundPath,
        `export const frontmatter = { title: "Custom 404" };
export default function CustomNotFound() {
  return <div>Custom Not Found Page</div>;
}`,
      );

      try {
        const state = createTestState({
          ...createEmptyManifest(),
          systemFiles: {
            html: null,
            notFound: customNotFoundPath,
            error: null,
            unoConfig: null,
          },
        });

        const result = await handleNotFound(state);

        expect(result.status).toBe(404);
        expect(result.html).toContain("Custom Not Found Page");
      } finally {
        // Clean up
        await Deno.remove(customNotFoundPath);
      }
    });
  },
);

describe("handleError", () => {
  it("should return 500 status", () => {
    const error = new Error("Test error");
    const result = handleError(error, "");

    expect(result.status).toBe(500);
  });

  it("should return error overlay HTML", () => {
    const error = new Error("Something went wrong");
    const result = handleError(error, "");

    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain("Build Error");
    expect(result.html).toContain("Something went wrong");
  });

  it("should include stack trace in overlay", () => {
    const error = new Error("Test error");
    error.stack = "Error: Test error\n    at test.ts:10:5";
    const result = handleError(error, "");

    expect(result.html).toContain("Stack Trace");
    expect(result.html).toContain("at test.ts:10:5");
  });

  it("should include hot reload script for recovery", () => {
    const error = new Error("Test error");
    const result = handleError(error, "");

    expect(result.html).toContain("__hot-reload");
    expect(result.html).toContain("WebSocket");
  });

  it("should include basePath in hot reload script", () => {
    const error = new Error("Test error");
    const result = handleError(error, "/docs");

    expect(result.html).toContain("/docs/__hot-reload");
  });
});

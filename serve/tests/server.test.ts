import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { TabiTestServer } from "../../test-utils/server.ts";
import { registerStaticServer } from "../server.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;
const FIXTURES_NO_404_DIR = new URL("./fixtures-no-404/", import.meta.url)
  .pathname;

describe("registerStaticServer", () => {
  describe("with _not-found.html", () => {
    let server: TabiTestServer;

    beforeAll(() => {
      server = new TabiTestServer();
      registerStaticServer(server.app, { rootDir: FIXTURES_DIR });
      server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it("serves index.html for root path", async () => {
      const res = await fetch(server.url("/"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Welcome Home");
    });

    it("serves index.html for directory paths", async () => {
      const res = await fetch(server.url("/blog/"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Blog Index");
    });

    it("serves HTML files without extension", async () => {
      const res = await fetch(server.url("/about"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("About Us");
    });

    it("serves nested HTML files without extension", async () => {
      const res = await fetch(server.url("/blog/post"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Blog Post");
    });

    it("serves JS bundles from __tabi directory", async () => {
      const res = await fetch(server.url("/__tabi/index-A1B2C3D4.js"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("index bundle");
    });

    it("returns custom 404 page for non-existent paths", async () => {
      const res = await fetch(server.url("/does-not-exist"));
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Page Not Found");
    });

    it("sets Content-Type header for HTML", async () => {
      const res = await fetch(server.url("/"));
      expect(res.headers.get("Content-Type")).toContain("text/html");
      await res.body?.cancel();
    });

    it("sets Content-Type header for JS", async () => {
      const res = await fetch(server.url("/__tabi/index-A1B2C3D4.js"));
      expect(res.headers.get("Content-Type")).toContain("javascript");
      await res.body?.cancel();
    });
  });

  describe("without _not-found.html", () => {
    let server: TabiTestServer;

    beforeAll(() => {
      server = new TabiTestServer();
      registerStaticServer(server.app, { rootDir: FIXTURES_NO_404_DIR });
      server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it("serves existing files", async () => {
      const res = await fetch(server.url("/"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Home without 404");
    });

    it("returns default 404 for non-existent paths", async () => {
      const res = await fetch(server.url("/does-not-exist"));
      expect(res.status).toBe(404);
      await res.body?.cancel();
    });
  });
});

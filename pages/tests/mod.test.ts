import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { TabiApp } from "@tabirun/app";
import { pages } from "../mod.ts";

describe("pages", () => {
  describe("factory", () => {
    it("should return dev, build, and serve functions", () => {
      const instance = pages();

      expect(typeof instance.dev).toBe("function");
      expect(typeof instance.build).toBe("function");
      expect(typeof instance.serve).toBe("function");
    });

    it("should accept empty config", () => {
      expect(() => pages()).not.toThrow();
    });

    it("should accept valid siteMetadata", () => {
      expect(() =>
        pages({
          siteMetadata: { baseUrl: "https://example.com" },
        })
      ).not.toThrow();
    });

    it("should reject invalid baseUrl", () => {
      expect(() =>
        pages({
          siteMetadata: { baseUrl: "not-a-url" },
        })
      ).toThrow();
    });
  });

  describe("dev", () => {
    it("should throw not implemented", () => {
      const { dev } = pages();
      const app = new TabiApp();

      expect(() => dev(app)).toThrow("Not implemented");
    });
  });

  describe("build", () => {
    it("should throw not implemented", () => {
      const { build } = pages();

      expect(() => build()).toThrow("Not implemented");
    });
  });

  describe("serve", () => {
    it("should throw not implemented", () => {
      const { serve } = pages();
      const app = new TabiApp();

      expect(() => serve(app)).toThrow("Not implemented");
    });
  });
});

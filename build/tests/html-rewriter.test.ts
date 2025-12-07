import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { rewriteAssetUrls } from "../html-rewriter.ts";

describe("rewriteAssetUrls", () => {
  describe("src attributes", () => {
    it("rewrites img src with double quotes", () => {
      const html = '<img src="/logo.png" alt="Logo">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="/logo-A1B2C3D4.png" alt="Logo">');
    });

    it("rewrites img src with single quotes", () => {
      const html = "<img src='/logo.png' alt='Logo'>";
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe("<img src='/logo-A1B2C3D4.png' alt='Logo'>");
    });

    it("rewrites script src", () => {
      const html = '<script src="/app.js"></script>';
      const assetMap = new Map([["/app.js", "/app-E5F6G7H8.js"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<script src="/app-E5F6G7H8.js"></script>');
    });

    it("leaves src unchanged if not in map", () => {
      const html = '<img src="/other.png">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="/other.png">');
    });
  });

  describe("href attributes", () => {
    it("rewrites link href with double quotes", () => {
      const html = '<link rel="stylesheet" href="/styles.css">';
      const assetMap = new Map([["/styles.css", "/styles-I9J0K1L2.css"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe(
        '<link rel="stylesheet" href="/styles-I9J0K1L2.css">',
      );
    });

    it("rewrites link href with single quotes", () => {
      const html = "<link rel='icon' href='/favicon.ico'>";
      const assetMap = new Map([["/favicon.ico", "/favicon-M3N4O5P6.ico"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe("<link rel='icon' href='/favicon-M3N4O5P6.ico'>");
    });

    it("rewrites anchor href", () => {
      const html = '<a href="/document.pdf">Download</a>';
      const assetMap = new Map([["/document.pdf", "/document-Q7R8S9T0.pdf"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<a href="/document-Q7R8S9T0.pdf">Download</a>');
    });

    it("leaves href unchanged if not in map", () => {
      const html = '<a href="/page">Link</a>';
      const assetMap = new Map([["/styles.css", "/styles-A1B2C3D4.css"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<a href="/page">Link</a>');
    });
  });

  describe("url() in inline styles", () => {
    it("rewrites url() with double quotes", () => {
      const html = '<div style="background: url("/bg.png")"></div>';
      const assetMap = new Map([["/bg.png", "/bg-U1V2W3X4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe(
        '<div style="background: url("/bg-U1V2W3X4.png")"></div>',
      );
    });

    it("rewrites url() with single quotes", () => {
      const html = "<div style=\"background: url('/bg.png')\"></div>";
      const assetMap = new Map([["/bg.png", "/bg-U1V2W3X4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe(
        "<div style=\"background: url('/bg-U1V2W3X4.png')\"></div>",
      );
    });

    it("rewrites url() without quotes", () => {
      const html = '<div style="background: url(/bg.png)"></div>';
      const assetMap = new Map([["/bg.png", "/bg-U1V2W3X4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe(
        '<div style="background: url(/bg-U1V2W3X4.png)"></div>',
      );
    });

    it("leaves url() unchanged if not in map", () => {
      const html = '<div style="background: url(/other.png)"></div>';
      const assetMap = new Map([["/bg.png", "/bg-U1V2W3X4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<div style="background: url(/other.png)"></div>');
    });
  });

  describe("external and special URLs", () => {
    it("leaves http:// URLs unchanged", () => {
      const html = '<img src="http://example.com/logo.png">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="http://example.com/logo.png">');
    });

    it("leaves https:// URLs unchanged", () => {
      const html = '<img src="https://cdn.example.com/logo.png">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="https://cdn.example.com/logo.png">');
    });

    it("leaves protocol-relative URLs unchanged", () => {
      const html = '<img src="//cdn.example.com/logo.png">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="//cdn.example.com/logo.png">');
    });

    it("leaves data URLs unchanged", () => {
      const html = '<img src="data:image/png;base64,ABC123">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="data:image/png;base64,ABC123">');
    });

    it("leaves URLs with query parameters unchanged when not in map", () => {
      const html = '<img src="/logo.png?v=123">';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      // Query param version not in map, so left unchanged
      expect(result).toBe('<img src="/logo.png?v=123">');
    });
  });

  describe("edge cases", () => {
    it("returns original HTML when asset map is empty", () => {
      const html = '<img src="/logo.png"><link href="/styles.css">';
      const assetMap = new Map<string, string>();

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe(html);
    });

    it("handles multiple assets in same HTML", () => {
      const html = `
        <img src="/logo.png">
        <link href="/styles.css">
        <script src="/app.js"></script>
      `;
      const assetMap = new Map([
        ["/logo.png", "/logo-A1B2C3D4.png"],
        ["/styles.css", "/styles-E5F6G7H8.css"],
        ["/app.js", "/app-I9J0K1L2.js"],
      ]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toContain('src="/logo-A1B2C3D4.png"');
      expect(result).toContain('href="/styles-E5F6G7H8.css"');
      expect(result).toContain('src="/app-I9J0K1L2.js"');
    });

    it("handles assets in subdirectories", () => {
      const html = '<img src="/images/photo.jpg">';
      const assetMap = new Map([[
        "/images/photo.jpg",
        "/images/photo-Y5Z6A7B8.jpg",
      ]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe('<img src="/images/photo-Y5Z6A7B8.jpg">');
    });

    it("preserves non-asset content", () => {
      const html = '<p>Hello world</p><img src="/logo.png"><p>Goodbye</p>';
      const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);

      const result = rewriteAssetUrls(html, assetMap);

      expect(result).toBe(
        '<p>Hello world</p><img src="/logo-A1B2C3D4.png"><p>Goodbye</p>',
      );
    });
  });
});

import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { rewriteCssUrls } from "../css-rewriter.ts";

describe("rewriteCssUrls", () => {
  it("rewrites url() with double quotes", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = 'background: url("/logo.png");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("/logo-A1B2C3D4.png");');
  });

  it("rewrites url() with single quotes", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = "background: url('/logo.png');";

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe("background: url('/logo-A1B2C3D4.png');");
  });

  it("rewrites url() without quotes", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = "background: url(/logo.png);";

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe("background: url(/logo-A1B2C3D4.png);");
  });

  it("leaves url() unchanged if not in map", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = 'background: url("/other.png");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("/other.png");');
  });

  it("leaves external URLs unchanged", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = 'background: url("https://example.com/image.png");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("https://example.com/image.png");');
  });

  it("leaves data URLs unchanged", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = 'background: url("data:image/png;base64,ABC123");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("data:image/png;base64,ABC123");');
  });

  it("handles multiple url() in same CSS", () => {
    const assetMap = new Map([
      ["/logo.png", "/logo-A1B2C3D4.png"],
      ["/bg.jpg", "/bg-E5F6G7H8.jpg"],
    ]);
    const css = `
      .header { background: url("/logo.png"); }
      .body { background: url("/bg.jpg"); }
    `;

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toContain('url("/logo-A1B2C3D4.png")');
    expect(result).toContain('url("/bg-E5F6G7H8.jpg")');
  });

  it("returns original CSS when asset map is empty", () => {
    const assetMap = new Map<string, string>();
    const css = 'background: url("/logo.png");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("/logo.png");');
  });

  it("handles basePath-prefixed paths", () => {
    const assetMap = new Map([
      ["/docs/logo.png", "/docs/logo-A1B2C3D4.png"],
    ]);
    const css = 'background: url("/docs/logo.png");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("/docs/logo-A1B2C3D4.png");');
  });

  it("handles multi-segment basePath", () => {
    const assetMap = new Map([
      ["/my-app/v2/images/logo.png", "/my-app/v2/images/logo-A1B2C3D4.png"],
    ]);
    const css = 'background: url("/my-app/v2/images/logo.png");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe(
      'background: url("/my-app/v2/images/logo-A1B2C3D4.png");',
    );
  });

  it("leaves relative paths unchanged", () => {
    const assetMap = new Map([["/logo.png", "/logo-A1B2C3D4.png"]]);
    const css = 'background: url("../fonts/font.woff2");';

    const result = rewriteCssUrls(css, assetMap);

    expect(result).toBe('background: url("../fonts/font.woff2");');
  });
});

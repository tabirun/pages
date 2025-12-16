import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import { createModifiedConfig } from "../server.ts";

describe("createModifiedConfig", () => {
  const TEST_DIR = new URL("./fixtures/config-test/", import.meta.url).pathname;
  const OUT_DIR = join(TEST_DIR, ".tabi");

  beforeAll(async () => {
    await Deno.mkdir(TEST_DIR, { recursive: true });
    await Deno.mkdir(OUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    await Deno.remove(TEST_DIR, { recursive: true });
  });

  it("creates modified config with preact overrides", async () => {
    const projectConfig = join(TEST_DIR, "deno.json");
    await Deno.writeTextFile(
      projectConfig,
      JSON.stringify({
        imports: {
          "@tabirun/pages": "jsr:@tabirun/pages@^0.5.0",
          "preact": "npm:preact@^10.0.0",
        },
      }),
    );

    const modifiedPath = await createModifiedConfig(OUT_DIR, projectConfig);
    const modified = JSON.parse(await Deno.readTextFile(modifiedPath));

    expect(modified.imports["@tabirun/pages"]).toBe(
      "jsr:@tabirun/pages@^0.5.0",
    );
    expect(modified.imports["preact"]).toBe("npm:preact@^10.25.4");
    expect(modified.imports["preact/hooks"]).toBe("npm:preact@^10.25.4/hooks");
    expect(modified.imports["preact-render-to-string"]).toBe(
      "npm:preact-render-to-string@^6.5.13",
    );
  });

  it("preserves other config options", async () => {
    const projectConfig = join(TEST_DIR, "deno-full.json");
    await Deno.writeTextFile(
      projectConfig,
      JSON.stringify({
        compilerOptions: { jsx: "react-jsx", jsxImportSource: "preact" },
        imports: { "lodash": "npm:lodash@^4.0.0" },
        nodeModulesDir: "auto",
      }),
    );

    const modifiedPath = await createModifiedConfig(OUT_DIR, projectConfig);
    const modified = JSON.parse(await Deno.readTextFile(modifiedPath));

    expect(modified.compilerOptions.jsx).toBe("react-jsx");
    expect(modified.nodeModulesDir).toBe("auto");
    expect(modified.imports["lodash"]).toBe("npm:lodash@^4.0.0");
    expect(modified.imports["preact"]).toBe("npm:preact@^10.25.4");
  });

  it("handles config without imports field", async () => {
    const projectConfig = join(TEST_DIR, "deno-minimal.json");
    await Deno.writeTextFile(
      projectConfig,
      JSON.stringify({
        compilerOptions: { jsx: "react-jsx" },
      }),
    );

    const modifiedPath = await createModifiedConfig(OUT_DIR, projectConfig);
    const modified = JSON.parse(await Deno.readTextFile(modifiedPath));

    expect(modified.imports["preact"]).toBe("npm:preact@^10.25.4");
    expect(modified.compilerOptions.jsx).toBe("react-jsx");
  });
});

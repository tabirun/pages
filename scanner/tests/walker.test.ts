import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path";
import { walkDirectory } from "../walker.ts";

async function collectEntries(
  dir: string,
): Promise<{ absolutePath: string; relativePath: string }[]> {
  const entries: { absolutePath: string; relativePath: string }[] = [];
  for await (const entry of walkDirectory(dir)) {
    entries.push(entry);
  }
  return entries;
}

describe("walkDirectory", () => {
  describe("file discovery", () => {
    it("should yield files in directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.writeTextFile(join(tempDir, "file1.ts"), "");
        await Deno.writeTextFile(join(tempDir, "file2.md"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(2);
        expect(entries.map((e) => e.relativePath).sort()).toEqual([
          "file1.ts",
          "file2.md",
        ]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should yield files in nested directories", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "subdir"));
        await Deno.writeTextFile(join(tempDir, "root.ts"), "");
        await Deno.writeTextFile(join(tempDir, "subdir", "nested.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(2);
        expect(entries.map((e) => e.relativePath).sort()).toEqual([
          "root.ts",
          "subdir/nested.ts",
        ]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should yield deeply nested files", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "a", "b", "c"), { recursive: true });
        await Deno.writeTextFile(join(tempDir, "a", "b", "c", "deep.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(1);
        expect(entries[0].relativePath).toBe("a/b/c/deep.ts");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should return absolute paths", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.writeTextFile(join(tempDir, "file.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries[0].absolutePath).toBe(join(tempDir, "file.ts"));
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("directory skipping", () => {
    it("should skip node_modules", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "node_modules"));
        await Deno.writeTextFile(
          join(tempDir, "node_modules", "package.json"),
          "",
        );
        await Deno.writeTextFile(join(tempDir, "src.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(1);
        expect(entries[0].relativePath).toBe("src.ts");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should skip dist directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "dist"));
        await Deno.writeTextFile(join(tempDir, "dist", "bundle.js"), "");
        await Deno.writeTextFile(join(tempDir, "src.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(1);
        expect(entries[0].relativePath).toBe("src.ts");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should skip hidden directories", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, ".hidden"));
        await Deno.writeTextFile(join(tempDir, ".hidden", "secret.ts"), "");
        await Deno.writeTextFile(join(tempDir, "visible.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(1);
        expect(entries[0].relativePath).toBe("visible.ts");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should skip nested node_modules", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "packages", "node_modules"), {
          recursive: true,
        });
        await Deno.writeTextFile(
          join(tempDir, "packages", "node_modules", "dep.js"),
          "",
        );
        await Deno.writeTextFile(join(tempDir, "packages", "index.ts"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(1);
        expect(entries[0].relativePath).toBe("packages/index.ts");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should not skip files starting with dot", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.writeTextFile(join(tempDir, ".gitignore"), "");
        await Deno.writeTextFile(join(tempDir, ".env"), "");

        const entries = await collectEntries(tempDir);

        expect(entries.length).toBe(2);
        expect(entries.map((e) => e.relativePath).sort()).toEqual([
          ".env",
          ".gitignore",
        ]);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty directory", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        const entries = await collectEntries(tempDir);
        expect(entries.length).toBe(0);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });

    it("should handle directory with only skipped content", async () => {
      const tempDir = await Deno.makeTempDir();
      try {
        await Deno.mkdir(join(tempDir, "node_modules"));
        await Deno.writeTextFile(
          join(tempDir, "node_modules", "package.json"),
          "",
        );

        const entries = await collectEntries(tempDir);
        expect(entries.length).toBe(0);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });
});

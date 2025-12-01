import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { pages } from "../mod.ts";

describe("pages/mod.ts", () => {
  it("should have pages function", () => {
    expect(typeof pages).toBe("function");
  });
});

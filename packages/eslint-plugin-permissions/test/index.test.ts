import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import plugin from "../src/index";

describe("plugin", () => {
  it("exports every rule in src/rules", () => {
    const files = readdirSync(new URL("../src/rules", import.meta.url))
      .map((file) => file.replace(/\.js$/, ""))
      .sort();

    expect(Object.keys(plugin.rules).sort()).toEqual(files);
  });
});

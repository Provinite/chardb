import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const eslint = new ESLint({ cwd: root });

/** The severity the repository's config gives a rule for a file. */
const severity = async (file: string, rule: string) => {
  const config = await eslint.calculateConfigForFile(file);
  const entry = config.rules?.[rule];
  const level = Array.isArray(entry) ? entry[0] : entry;
  return level === 2 || level === "error"
    ? "error"
    : level === 1 || level === "warn"
      ? "warn"
      : "off";
};

// Which files each rule from #484 reaches, as configured in .eslintrc.cjs.
describe("repository config", () => {
  it("bans inline styles in TSX files", async () => {
    expect(
      await severity(
        "apps/frontend/src/components/Layout.tsx",
        "@chardb/styles/no-inline-style",
      ),
    ).toBe("error");
    expect(
      await severity(
        "packages/ui/src/components/Button.tsx",
        "@chardb/styles/no-inline-style",
      ),
    ).toBe("error");
  });

  it("bans the browser's scroll calls outside the scroll helpers", async () => {
    for (const file of [
      "apps/frontend/src/components/Layout.tsx",
      "apps/frontend/src/lib/pageMeta.ts",
      "packages/ui/src/components/Menu.tsx",
    ]) {
      expect(await severity(file, "no-restricted-properties")).toBe("error");
    }
    // The helpers themselves, and test setup that stubs what jsdom lacks.
    for (const file of [
      "packages/ui/src/motion/scroll.ts",
      "apps/frontend/src/setupTests.ts",
    ]) {
      expect(await severity(file, "no-restricted-properties")).toBe("off");
    }
  });

  it("requires track helpers for grid columns in style files", async () => {
    for (const file of [
      "apps/frontend/src/components/Layout.css.ts",
      "packages/ui/src/layout/Grid.css.ts",
      "packages/ui/src/css/split.css.ts",
    ]) {
      expect(
        await severity(file, "@chardb/styles/grid-columns-via-track"),
      ).toBe("error");
    }
  });
});

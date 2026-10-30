import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@typescript-eslint/parser";
import { describe, expect, it } from "vitest";
import allowlist from "../../../apps/frontend/styled-components-allowlist.json";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const scanned = ["apps/frontend/src", "packages/ui/src"];

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const relative = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(relative);
      return /\.tsx?$/.test(entry.name) ? [relative] : [];
    },
  );
}

function importsStyledComponents(file: string): boolean {
  const program = parse(readFileSync(path.join(root, file), "utf8"), {
    ecmaVersion: 2022,
    sourceType: "module",
    // Scope analysis reads node ranges.
    range: true,
    ecmaFeatures: { jsx: file.endsWith(".tsx") },
  });
  return program.body.some(
    (statement) =>
      statement.type === "ImportDeclaration" &&
      statement.source.value === "styled-components",
  );
}

describe("styled-components allowlist", () => {
  it("lists exactly the files that still import styled-components", () => {
    const importing = scanned
      .flatMap(sourceFiles)
      .filter(importsStyledComponents)
      .sort();

    // A migrated file comes off the list in the same change, so the list
    // tracks what is left to migrate.
    expect(allowlist).toEqual(importing);
  });
});

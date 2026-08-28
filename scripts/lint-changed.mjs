#!/usr/bin/env node
/**
 * Lints and format-checks only the files a change actually touches.
 *
 * The repo predates any working lint setup, so a repo-wide gate would fail on
 * hundreds of pre-existing violations. Scoping to changed files holds new and
 * modified code to the full rule set while leaving untouched legacy code alone.
 *
 * Note this is file-scoped, not line-scoped: touching one line of a file
 * surfaces every violation in that file.
 *
 * Usage: node scripts/lint-changed.mjs [--base <ref>]
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const LINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);
const PRETTIER_EXTS = new Set([...LINT_EXTS, ".css"]);

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/** Resolve what to diff against, preferring an explicitly passed ref. */
function resolveBase() {
  const flag = process.argv.indexOf("--base");
  if (flag !== -1 && process.argv[flag + 1]) return process.argv[flag + 1];
  if (process.env.LINT_BASE) return process.env.LINT_BASE;

  // Pull requests: compare against the target branch.
  if (process.env.GITHUB_BASE_REF)
    return `origin/${process.env.GITHUB_BASE_REF}`;

  // Local default: whatever main has that this branch branched from.
  for (const ref of ["origin/main", "main"]) {
    try {
      git("rev-parse", "--verify", ref);
      return ref;
    } catch {
      /* try the next one */
    }
  }
  return "HEAD~1";
}

function changedFiles(base) {
  // Three-dot diffs against the merge base, so unrelated commits landed on the
  // base branch since branching are not attributed to this change.
  const range = `${base}...HEAD`;
  const out = git("diff", "--name-only", "--diff-filter=ACMR", range);
  return out
    ? out
        .split("\n")
        .filter(Boolean)
        // Renames and rewritten history can name paths that no longer exist.
        .filter((f) => existsSync(f))
    : [];
}

async function runEslint(files) {
  const targets = files.filter((f) => LINT_EXTS.has(path.extname(f)));
  if (targets.length === 0) return { ok: true, checked: 0 };

  const eslint = new ESLint();
  // Passing an explicitly-ignored path makes ESLint emit a warning, so drop
  // ignored files up front rather than letting them pollute the report.
  const kept = [];
  for (const file of targets) {
    if (!(await eslint.isPathIgnored(file))) kept.push(file);
  }
  if (kept.length === 0) return { ok: true, checked: 0 };

  const results = await eslint.lintFiles(kept);
  const output = (await eslint.loadFormatter("stylish")).format(results);
  if (output.trim()) console.log(output);

  const errors = results.reduce((n, r) => n + r.errorCount, 0);
  const warnings = results.reduce((n, r) => n + r.warningCount, 0);
  if (warnings > 0 && errors === 0) {
    console.log(
      `ESLint: ${warnings} warning(s); not failing the build on warnings.`,
    );
  }
  return { ok: errors === 0, checked: kept.length, errors };
}

function runPrettier(files) {
  const targets = files.filter((f) => PRETTIER_EXTS.has(path.extname(f)));
  if (targets.length === 0) return { ok: true, checked: 0 };
  try {
    // Prettier silently skips anything matched by .prettierignore.
    execFileSync("yarn", ["prettier", "--check", ...targets], {
      stdio: "inherit",
    });
    return { ok: true, checked: targets.length };
  } catch {
    return { ok: false, checked: targets.length };
  }
}

const base = resolveBase();
const files = changedFiles(base);

if (files.length === 0) {
  console.log(`No changed files against ${base}; nothing to lint.`);
  process.exit(0);
}
console.log(`Checking ${files.length} changed file(s) against ${base}.\n`);

const lint = await runEslint(files);
console.log(`\nESLint checked ${lint.checked} file(s).`);
const fmt = runPrettier(files);
console.log(`Prettier checked ${fmt.checked} file(s).`);

if (!lint.ok || !fmt.ok) {
  console.error(
    "\nLint failed. Run `yarn lint:fix` to apply what can be fixed automatically.",
  );
  process.exit(1);
}
console.log("\nAll changed files pass lint and formatting.");

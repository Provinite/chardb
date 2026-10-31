import type { Plugin } from "vite";

/** The size no JavaScript chunk may pass, before compression (#465). */
export const CHUNK_BUDGET_BYTES = 500 * 1024;

interface OutputFile {
  type: "chunk" | "asset";
  fileName: string;
  code?: string;
}

/** The chunks larger than `limit` bytes. */
export const overBudget = (files: OutputFile[], limit: number) =>
  files.flatMap((file) => {
    if (file.type !== "chunk" || file.code === undefined) return [];
    const bytes = Buffer.byteLength(file.code);
    return bytes > limit ? [{ fileName: file.fileName, bytes }] : [];
  });

/**
 * Fails the build when a chunk passes the budget, where Vite's own
 * `chunkSizeWarningLimit` only warns. Pages load their code on demand, so a
 * chunk this large means something heavy reached the shell or a page that
 * should have been split.
 */
export const chunkBudget = (limit = CHUNK_BUDGET_BYTES): Plugin => ({
  name: "chunk-budget",
  apply: "build",
  // Not `generateBundle`: Vite adds the entry's preload map after every
  // plugin's `generateBundle` has run, so only now are the bytes final.
  writeBundle(_options, bundle) {
    const over = overBudget(Object.values(bundle), limit);
    if (over.length === 0) return;
    this.error(
      `JavaScript chunk over the ${limit / 1024} kB budget: ` +
        over
          .map(
            ({ fileName, bytes }) =>
              `${fileName} (${(bytes / 1024).toFixed(1)} kB)`,
          )
          .join(", "),
    );
  },
});

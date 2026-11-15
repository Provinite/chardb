export type Cell = string | number | boolean | null | undefined;

/** Left-aligned columns, two spaces apart, no header. */
export function table(rows: Cell[][]): string {
  if (rows.length === 0) return "";
  const text = rows.map((row) =>
    row.map((cell) => (cell == null ? "" : String(cell))),
  );
  const widths = text[0].map((_, column) =>
    Math.max(...text.map((row) => row[column]?.length ?? 0)),
  );
  return text
    .map((row) =>
      row
        .map((cell, column) =>
          column === row.length - 1 ? cell : cell.padEnd(widths[column]),
        )
        .join("  ")
        .trimEnd(),
    )
    .join("\n")
    .concat("\n");
}

export function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

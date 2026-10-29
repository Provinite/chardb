/**
 * How much the backend's tracing records, from `DEBUG_TRACE_LEVEL`.
 *
 * - `standard` (the default): requests, GraphQL operations, Prisma operations
 *   and their SQL. Enough to see which request was slow and whether the time
 *   went to the database.
 * - `full`: also a span for every resolved GraphQL field and every DataLoader
 *   load. For debugging a slow field. On a 100-row ledger request taking
 *   about 450 CPU-ms, field spans cost about 100 and DataLoader spans about
 *   45, each measured with the other on. Prod's backend task has a quarter of
 *   a CPU, so that is seconds there.
 */
export type TraceDetailLevel = "standard" | "full";

export interface TraceDetailOptions {
  level: TraceDetailLevel;
  /** A span per resolved GraphQL field. */
  fieldSpans: boolean;
  /** A span per DataLoader load and batch. */
  dataloaderSpans: boolean;
  /** The value given, when it was not a level: it fell back to standard. */
  unrecognised?: string;
}

export function traceDetailOptions(
  value: string | undefined,
): TraceDetailOptions {
  const given = value?.trim().toLowerCase() ?? "";
  const full = given === "full";
  return {
    level: full ? "full" : "standard",
    fieldSpans: full,
    dataloaderSpans: full,
    ...(given !== "" && given !== "full" && given !== "standard"
      ? { unrecognised: value }
      : {}),
  };
}

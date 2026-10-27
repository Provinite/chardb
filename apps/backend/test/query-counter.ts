import { Prisma, PrismaClient } from "@prisma/client";
import { DatabaseService } from "../src/database/database.service";

/** What one measured block of work cost the database. */
export interface QueryCount {
  /** SQL statements sent to Postgres; a batch of lookups counts once per table. */
  sql: number;
  /** Statements per table and kind, e.g. `likes COUNT`. */
  byTable: Record<string, number>;
}

/**
 * Counts SQL from Prisma's own query log. Tracing spans would be the natural
 * source, but when Prisma batches lookups on several models into one engine
 * request it exports a db_query span for only the first of them.
 */
export class QueryCounter {
  private statements: string[] = [];

  /** A DatabaseService that reports every statement to this counter. */
  createDatabaseService(): DatabaseService {
    const db = new DatabaseService({
      log: [{ emit: "event", level: "query" }],
    });
    // DatabaseService's type doesn't carry the log config, so $on("query")
    // isn't in its signature even though the client emits it
    (db as unknown as PrismaClient<Prisma.PrismaClientOptions, "query">).$on(
      "query",
      (event) => this.statements.push(event.query),
    );
    return db;
  }

  async measure(work: () => Promise<unknown>): Promise<QueryCount> {
    this.statements = [];
    await work();
    // Query events are emitted from the engine callback, after the result
    await new Promise((resolve) => setImmediate(resolve));

    const byTable: Record<string, number> = {};
    for (const statement of this.statements) {
      const table = /FROM "public"\."(\w+)"/.exec(statement)?.[1] ?? "other";
      const kind = /^SELECT COUNT/.test(statement)
        ? "COUNT"
        : (/^\w+/.exec(statement)?.[0] ?? "");
      const key = `${table} ${kind}`;
      byTable[key] = (byTable[key] ?? 0) + 1;
    }
    return { sql: this.statements.length, byTable };
  }
}

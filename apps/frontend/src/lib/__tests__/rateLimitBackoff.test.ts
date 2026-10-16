import { describe, it, expect } from "vitest";
import {
  ApolloLink,
  Observable,
  execute,
  type FetchResult,
} from "@apollo/client";
import { GraphQLError, parse } from "graphql";
import { createRateLimitBackoff } from "../rateLimitBackoff";
import { TOO_MANY_REQUESTS } from "../rateLimit";

// parse() rather than a gql tag: codegen validates every gql document in
// src/ against the real schema, and this one never reaches a server.
const QUERY = parse("query Ping { ping }");

const refusal: FetchResult = {
  errors: [
    new GraphQLError("Too many", { extensions: { code: TOO_MANY_REQUESTS } }),
  ],
};
const ok: FetchResult = { data: { ping: true } };

/**
 * A backoff on a hand-wound clock, in front of a network stub that answers
 * with whatever `next` holds and counts how often it was reached.
 */
function setup() {
  let time = 0;
  let sent = 0;
  let next: FetchResult = ok;
  const backoff = createRateLimitBackoff(() => time);
  const network = new ApolloLink(
    () =>
      new Observable<FetchResult>((observer) => {
        sent += 1;
        observer.next(next);
        observer.complete();
      }),
  );
  const link = ApolloLink.from([backoff.link, network]);

  const request = () =>
    new Promise<FetchResult>((resolve, reject) => {
      execute(link, { query: QUERY }).subscribe({
        next: resolve,
        error: reject,
      });
    });

  return {
    backoff,
    request,
    sent: () => sent,
    respondWith: (result: FetchResult) => {
      next = result;
    },
    advance: (ms: number) => {
      time += ms;
    },
  };
}

const code = (result: FetchResult) => result.errors?.[0]?.extensions?.code;

describe("rate limit backoff", () => {
  it("holds every request back for 5s after a refusal, locally", async () => {
    const t = setup();
    t.respondWith(refusal);
    await t.request();
    expect(t.sent()).toBe(1);

    t.respondWith(ok);
    t.advance(4_999);
    expect(code(await t.request())).toBe(TOO_MANY_REQUESTS);
    expect(t.sent()).toBe(1);

    t.advance(1);
    expect(await t.request()).toEqual(ok);
    expect(t.sent()).toBe(2);
  });

  it("steps 5s, 7s, 15s on consecutive refusals, then stays at 15s", async () => {
    const t = setup();
    t.respondWith(refusal);

    for (const ms of [5_000, 7_000, 15_000, 15_000]) {
      await t.request();
      t.advance(ms - 1);
      expect(t.backoff.isBlocked()).toBe(true);
      t.advance(1);
      expect(t.backoff.isBlocked()).toBe(false);
    }
  });

  it("does not escalate on refusals that land during a block", () => {
    // Two requests in flight together, both refused: a page's queries
    // throttled at once. The second refusal must not turn 5s into 7s.
    let time = 0;
    const backoff = createRateLimitBackoff(() => time);
    const pending: Array<(result: FetchResult) => void> = [];
    const link = ApolloLink.from([
      backoff.link,
      new ApolloLink(
        () =>
          new Observable<FetchResult>((observer) => {
            pending.push((result) => {
              observer.next(result);
              observer.complete();
            });
          }),
      ),
    ]);

    execute(link, { query: QUERY }).subscribe({});
    execute(link, { query: QUERY }).subscribe({});
    pending.forEach((respond) => respond(refusal));

    time = 5_000;
    expect(backoff.isBlocked()).toBe(false);
  });

  it("returns to 5s after a success", async () => {
    const t = setup();
    t.respondWith(refusal);
    await t.request();
    t.advance(5_000);
    await t.request();
    t.advance(7_000);

    t.respondWith(ok);
    await t.request();

    t.respondWith(refusal);
    await t.request();
    t.advance(5_000);
    expect(t.backoff.isBlocked()).toBe(false);
  });
});

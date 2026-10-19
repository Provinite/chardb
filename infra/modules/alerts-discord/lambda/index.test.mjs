// Run with: node --test "infra/modules/alerts-discord/lambda/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler, toDiscordMessage } from "./index.mjs";

const alarm = (overrides = {}) => ({
  AlarmName: "chardb-prod-halloween-needs-staff",
  AlarmDescription:
    "A Halloween player is owed something: search the logs for the interactionId.",
  NewStateValue: "ALARM",
  OldStateValue: "OK",
  NewStateReason:
    "Threshold Crossed: 1 datapoint [1.0] was greater than the threshold (0.0).",
  StateChangeTime: "2026-10-31T11:02:00.000+0000",
  AlarmArn:
    "arn:aws:cloudwatch:us-east-1:000000000000:alarm:chardb-prod-halloween-needs-staff",
  ...overrides,
});

const snsEvent = (...messages) => ({
  Records: messages.map((m) => ({
    Sns: { Message: typeof m === "string" ? m : JSON.stringify(m) },
  })),
});

test("an alarm going off is a red embed naming it, saying why, linking to it", () => {
  const { embeds } = toDiscordMessage(alarm());
  assert.equal(embeds.length, 1);
  const [embed] = embeds;
  assert.equal(embed.title, "ALARM: chardb-prod-halloween-needs-staff");
  assert.equal(embed.color, 0xd93025);
  assert.equal(
    embed.description,
    "A Halloween player is owed something: search the logs for the interactionId.",
  );
  assert.deepEqual(embed.fields, [
    {
      name: "Why",
      value:
        "Threshold Crossed: 1 datapoint [1.0] was greater than the threshold (0.0).",
    },
  ]);
  assert.equal(
    embed.url,
    "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:alarm/chardb-prod-halloween-needs-staff",
  );
  assert.equal(embed.timestamp, "2026-10-31T11:02:00.000Z");
});

test("an alarm clearing is green", () => {
  const [embed] = toDiscordMessage(
    alarm({ NewStateValue: "OK", OldStateValue: "ALARM" }),
  ).embeds;
  assert.equal(embed.title, "OK: chardb-prod-halloween-needs-staff");
  assert.equal(embed.color, 0x1e8e3e);
});

test("the account id never reaches Discord", () => {
  assert.doesNotMatch(
    JSON.stringify(toDiscordMessage(alarm())),
    /000000000000/,
  );
});

test("anything that is not an alarm still arrives, as plain text", () => {
  assert.deepEqual(toDiscordMessage("hello from the SNS console"), {
    content: "hello from the SNS console",
  });
  const long = "x".repeat(3000);
  assert.equal(toDiscordMessage(long).content.length, 2000);
});

test("posts each record to the webhook it looked up", async () => {
  const posts = [];
  const handler = createHandler({
    getWebhookUrl: async () => "https://discord.test/hook",
    post: async (url, body) => {
      posts.push({ url, body });
      return { ok: true, status: 204, text: async () => "" };
    },
  });
  await handler(snsEvent(alarm(), "plain"));
  assert.equal(posts.length, 2);
  assert.equal(posts[0].url, "https://discord.test/hook");
  assert.equal(
    posts[0].body.embeds[0].title,
    "ALARM: chardb-prod-halloween-needs-staff",
  );
  assert.deepEqual(posts[1].body, { content: "plain" });
});

test("fails when Discord refuses, so the failure shows in Lambda's own metrics", async () => {
  const handler = createHandler({
    getWebhookUrl: async () => "https://discord.test/hook",
    post: async () => ({
      ok: false,
      status: 429,
      text: async () => '{"retry_after":1.2}',
    }),
  });
  await assert.rejects(handler(snsEvent(alarm())), /Discord answered 429/);
});

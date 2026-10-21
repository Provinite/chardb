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

const ALERTS = {
  "halloween-needs-staff": {
    ALARM: {
      title: "Halloween: a player may be owed something",
      description: "A result never reached Discord.",
      whatToDo: "Open the halloween-needs-attention query.",
    },
    OK: { title: "Halloween: nobody owed", description: "All clear." },
  },
};

test("a known alarm going off posts its own message, red, with what to do", () => {
  const [embed] = toDiscordMessage(alarm(), ALERTS).embeds;
  assert.equal(embed.title, "Halloween: a player may be owed something");
  assert.equal(embed.description, "A result never reached Discord.");
  assert.equal(embed.color, 0xd93025);
  assert.deepEqual(embed.fields, [
    { name: "What to do", value: "Open the halloween-needs-attention query." },
    {
      name: "Why it fired",
      value:
        "Threshold Crossed: 1 datapoint [1.0] was greater than the threshold (0.0).",
    },
  ]);
  assert.match(embed.url, /alarm\/chardb-prod-halloween-needs-staff$/);
  assert.equal(embed.timestamp, "2026-10-31T11:02:00.000Z");
});

test("a known alarm clearing posts its own all-clear, green", () => {
  const [embed] = toDiscordMessage(
    alarm({ NewStateValue: "OK", OldStateValue: "ALARM" }),
    ALERTS,
  ).embeds;
  assert.equal(embed.title, "Halloween: nobody owed");
  assert.equal(embed.description, "All clear.");
  assert.equal(embed.color, 0x1e8e3e);
});

// Discord refuses the whole message, with a 400, if any part is too long.
test("cuts every part of the embed to what Discord accepts", () => {
  const long = (n) => "x".repeat(n);
  const [embed] = toDiscordMessage(
    alarm({
      AlarmName: `chardb-prod-${long(300)}`,
      AlarmDescription: long(5000),
      NewStateReason: long(5000),
    }),
  ).embeds;
  assert.ok(embed.title.length <= 256);
  assert.ok(embed.description.length <= 2048);
  for (const field of embed.fields) {
    assert.ok(field.value.length <= 1024);
  }
  assert.ok(embed.title.endsWith("…"));
  const total =
    embed.title.length +
    embed.description.length +
    embed.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
  assert.ok(total <= 6000);
});

test("every alarm Terraform creates has its own message in alerts.json", async () => {
  const { readFile } = await import("node:fs/promises");
  const alerts = JSON.parse(
    await readFile(new URL("./alerts.json", import.meta.url), "utf8"),
  );
  for (const name of ["halloween-needs-staff", "halloween-errors"]) {
    for (const state of ["ALARM", "OK"]) {
      assert.ok(alerts[name]?.[state]?.title, `${name} ${state} title`);
      assert.ok(alerts[name]?.[state]?.description, `${name} ${state} text`);
    }
    assert.ok(alerts[name].ALARM.whatToDo, `${name} what to do`);
  }
});

test("an alarm with no message of its own is a red embed naming it, saying why, linking to it", () => {
  const { embeds } = toDiscordMessage(alarm(), {});
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

test("an alarm with no message of its own is green when it clears", () => {
  const [embed] = toDiscordMessage(
    alarm({ NewStateValue: "OK", OldStateValue: "ALARM" }),
    {},
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
  // The message from alerts.json, as shipped.
  assert.equal(
    posts[0].body.embeds[0].title,
    "Halloween: a player may be owed something",
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

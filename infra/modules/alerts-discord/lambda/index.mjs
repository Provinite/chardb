// Posts CloudWatch alarms to a Discord channel.
//
// SNS cannot post to a Discord webhook itself: it never gets past the
// subscription confirmation, and Discord only accepts its own message shape.
// This sits between them. The webhook URL is a password, so it lives in an
// SSM SecureString, set by hand (DEPLOYMENT_GUIDE.md), and is read here at
// run time; it is never in Terraform, an environment variable or a log line.

import { readFileSync } from "node:fs";

const COLORS = { ALARM: 0xd93025, OK: 0x1e8e3e };
const NEUTRAL = 0x9aa0a6;

// Discord refuses the whole message, with a 400, if any part is over its
// limit. The description is held well under its own 4096 so the embed stays
// under Discord's 6000 characters in all.
const LIMITS = { content: 2000, title: 256, description: 2048, field: 1024 };

/**
 * Each alarm's own message, keyed by its name without the
 * `<project>-<environment>-` prefix: a title and description for when it goes
 * off and when it clears, and what to do about it.
 */
const ALERTS = JSON.parse(
  readFileSync(new URL("./alerts.json", import.meta.url), "utf8"),
);

const cut = (text, limit) =>
  text.length > limit ? `${text.slice(0, limit - 1)}…` : text;

/** CloudWatch writes `+0000`; Date wants `+00:00`. */
const isoTime = (time) =>
  new Date(time.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")).toISOString();

const alertFor = (alerts, alarmName) =>
  Object.entries(alerts).find(([name]) => alarmName.endsWith(`-${name}`))?.[1];

/**
 * A CloudWatch alarm notification as a Discord message: one embed, red when
 * it goes off and green when it clears, linking to the alarm. An alarm listed
 * in alerts.json says what it means and what to do; any other names itself
 * and gives CloudWatch's description. Anything that is not an alarm (say, a
 * test publish from the SNS console) arrives as plain text.
 */
export function toDiscordMessage(message, alerts = ALERTS) {
  let alarm;
  try {
    alarm = typeof message === "string" ? JSON.parse(message) : message;
  } catch {
    alarm = null;
  }
  if (!alarm || typeof alarm !== "object" || !alarm.AlarmName) {
    return { content: String(message).slice(0, LIMITS.content) };
  }

  // arn:aws:cloudwatch:<region>:<account>:alarm:<name>. Only the region is
  // used: the account id stays out of Discord.
  const region = alarm.AlarmArn?.split(":")[3];
  const reason = alarm.NewStateReason ?? "Not given";
  const own = alertFor(alerts, alarm.AlarmName)?.[alarm.NewStateValue];
  const text = own
    ? {
        title: own.title,
        description: own.description,
        fields: [
          ...(own.whatToDo
            ? [{ name: "What to do", value: own.whatToDo }]
            : []),
          { name: "Why it fired", value: reason },
        ],
      }
    : {
        title: `${alarm.NewStateValue}: ${alarm.AlarmName}`,
        description: alarm.AlarmDescription,
        fields: [{ name: "Why", value: reason }],
      };
  const embed = {
    title: cut(text.title, LIMITS.title),
    color: COLORS[alarm.NewStateValue] ?? NEUTRAL,
    ...(text.description
      ? { description: cut(text.description, LIMITS.description) }
      : {}),
    fields: text.fields.map(({ name, value }) => ({
      name,
      value: cut(value, LIMITS.field),
    })),
    ...(region
      ? {
          url: `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:alarm/${encodeURIComponent(alarm.AlarmName)}`,
        }
      : {}),
    ...(alarm.StateChangeTime
      ? { timestamp: isoTime(alarm.StateChangeTime) }
      : {}),
  };
  return { embeds: [embed] };
}

/**
 * The Lambda handler, with its two outside calls passed in so the tests need
 * neither AWS nor Discord.
 */
export function createHandler({ getWebhookUrl, post }) {
  return async (event) => {
    const url = await getWebhookUrl();
    for (const record of event.Records ?? []) {
      const body = toDiscordMessage(record.Sns.Message);
      const response = await post(url, body);
      if (!response.ok) {
        // The status and Discord's reason, never the URL.
        throw new Error(
          `Discord answered ${response.status}: ${await response.text()}`,
        );
      }
    }
  };
}

let cachedUrl;

/** Read once per container; alarms are rare, so most calls are cold anyway. */
async function webhookUrlFromSsm() {
  if (!cachedUrl) {
    // The AWS SDK ships with the Node.js Lambda runtime. Imported here, not at
    // the top, so the tests run without it installed.
    const { SSMClient, GetParameterCommand } = await import(
      "@aws-sdk/client-ssm"
    );
    const { Parameter } = await new SSMClient({}).send(
      new GetParameterCommand({
        Name: process.env.WEBHOOK_URL_PARAMETER,
        WithDecryption: true,
      }),
    );
    cachedUrl = Parameter.Value;
  }
  return cachedUrl;
}

const postJson = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const handler = createHandler({
  getWebhookUrl: webhookUrlFromSsm,
  post: postJson,
});

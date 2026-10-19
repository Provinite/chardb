// Posts CloudWatch alarms to a Discord channel.
//
// SNS cannot post to a Discord webhook itself: it never gets past the
// subscription confirmation, and Discord only accepts its own message shape.
// This sits between them. The webhook URL is a password, so it lives in an
// SSM SecureString, set by hand (DEPLOYMENT_GUIDE.md), and is read here at
// run time; it is never in Terraform, an environment variable or a log line.

const COLORS = { ALARM: 0xd93025, OK: 0x1e8e3e };
const NEUTRAL = 0x9aa0a6;
const DISCORD_CONTENT_LIMIT = 2000;

/** CloudWatch writes `+0000`; Date wants `+00:00`. */
const isoTime = (time) =>
  new Date(time.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")).toISOString();

/**
 * A CloudWatch alarm notification as a Discord message: one embed, red when
 * it goes off and green when it clears, linking to the alarm. Anything else
 * (say, a test publish from the SNS console) arrives as plain text.
 */
export function toDiscordMessage(message) {
  let alarm;
  try {
    alarm = typeof message === "string" ? JSON.parse(message) : message;
  } catch {
    alarm = null;
  }
  if (!alarm || typeof alarm !== "object" || !alarm.AlarmName) {
    return { content: String(message).slice(0, DISCORD_CONTENT_LIMIT) };
  }

  // arn:aws:cloudwatch:<region>:<account>:alarm:<name>. Only the region is
  // used: the account id stays out of Discord.
  const region = alarm.AlarmArn?.split(":")[3];
  const embed = {
    title: `${alarm.NewStateValue}: ${alarm.AlarmName}`,
    color: COLORS[alarm.NewStateValue] ?? NEUTRAL,
    ...(alarm.AlarmDescription ? { description: alarm.AlarmDescription } : {}),
    fields: [{ name: "Why", value: alarm.NewStateReason ?? "Not given" }],
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

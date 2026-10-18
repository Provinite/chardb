/**
 * The `event` field on every structured Halloween log line, so one search
 * finds every occurrence. Every line about a command also carries
 * `interactionId` -- the "Reference ID" players see on errors -- so searching
 * for that one value turns up the whole story of a command.
 */
export const HalloweenLogEvent = {
  /** A signed command arrived and was acknowledged. */
  InteractionReceived: "halloween.interaction.received",
  /** A request failed the signature check. */
  InteractionRejected: "halloween.interaction.rejected",
  /** Discord's endpoint check. */
  Ping: "halloween.interaction.ping",
  /** A slash command used outside a server. */
  NotInGuild: "halloween.interaction.not_in_guild",
  /** An interaction type the bot does not handle (buttons, autocomplete...). */
  UnsupportedInteraction: "halloween.interaction.unsupported",

  /** A command finished; `outcome` is ok, refused, failed or unavailable. */
  CommandCompleted: "halloween.command.completed",
  /** The deferred reply never appeared, so the command did not run. */
  ReplyUnavailable: "halloween.command.reply_unavailable",
  /** The player could not be told why their command failed. */
  ReportFailed: "halloween.command.report_failed",

  KnockRolled: "halloween.knock.rolled",
  KnockLost: "halloween.knock.lost",
  KnockWon: "halloween.knock.won",
  AdminKnock: "halloween.knock.admin",
  PrizeDelivered: "halloween.prize.delivered",
  PrizeDeliveryFailed: "halloween.prize.delivery_failed",

  GiftySent: "halloween.gifty.sent",
  GiftyRateLimited: "halloween.gifty.rate_limited",

  SettingsCreated: "halloween.settings.created",
  SettingChanged: "halloween.settings.changed",
  PrizeAdded: "halloween.prize.added",
  /** Staff marked a prize with no chardb item or character as handed over. */
  PrizeMarkedDelivered: "halloween.prize.marked_delivered",
  PrizeUnmarkedDelivered: "halloween.prize.unmarked_delivered",
  /** A site admin turned the event on or off for a community. */
  CommunityToggled: "halloween.community.toggled",
  DeviantArtSaved: "halloween.deviantart.saved",
  WinChannelTested: "halloween.win_channel.tested",
} as const;

export type HalloweenLogEvent =
  (typeof HalloweenLogEvent)[keyof typeof HalloweenLogEvent];

/** A structured log line: winston keeps every field besides `message`. */
export interface HalloweenLogLine {
  event: HalloweenLogEvent;
  message: string;
  [field: string]: unknown;
}

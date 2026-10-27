/**
 * The `event` field on every structured Halloween log line, so one search
 * finds every occurrence. Every line about a command also carries
 * `interactionId` -- the "Reference ID" players see on errors -- so searching
 * for that one value turns up the whole story of a command.
 */
export const HalloweenLogEvent = {
  /** A signed command arrived. */
  InteractionReceived: "halloween.interaction.received",
  /**
   * The reply never reached Discord: the connection closed first, usually
   * because Discord stopped waiting after three seconds. Whatever the command
   * saved stands; `replyTitle` says what the player missed.
   */
  ReplyNotSent: "halloween.interaction.reply_not_sent",
  /** A request failed the signature check. */
  InteractionRejected: "halloween.interaction.rejected",
  /** Discord's endpoint check. */
  Ping: "halloween.interaction.ping",
  /** A slash command used outside a server. */
  NotInGuild: "halloween.interaction.not_in_guild",
  /** An interaction type the bot does not handle (buttons, autocomplete...). */
  UnsupportedInteraction: "halloween.interaction.unsupported",

  /** A command finished; `outcome` is ok, refused or failed. */
  CommandCompleted: "halloween.command.completed",
  /** Work a command left for after its reply failed. */
  AfterReplyFailed: "halloween.command.after_reply_failed",

  KnockRolled: "halloween.knock.rolled",
  KnockLost: "halloween.knock.lost",
  KnockWon: "halloween.knock.won",
  AdminKnock: "halloween.knock.admin",
  /** A win that stands, shown without its prize's picture. */
  PrizeImageLookupFailed: "halloween.prize.image_lookup_failed",

  GiftySent: "halloween.gifty.sent",
  GiftyRateLimited: "halloween.gifty.rate_limited",

  SettingsCreated: "halloween.settings.created",
  SettingChanged: "halloween.settings.changed",
  PrizeAdded: "halloween.prize.added",
  PrizeUpdated: "halloween.prize.updated",
  PrizeRemoved: "halloween.prize.removed",
  /** Staff marked a prize with no chardb item or character as handed over. */
  PrizeMarkedDelivered: "halloween.prize.marked_delivered",
  PrizeUnmarkedDelivered: "halloween.prize.unmarked_delivered",
  /** A site admin turned the event on or off for a community. */
  CommunityToggled: "halloween.community.toggled",
  DeviantArtSaved: "halloween.deviantart.saved",
  /** A player rearranged their candy board. */
  CandyBoardSaved: "halloween.candy_board.saved",
  WinChannelTested: "halloween.win_channel.tested",
  /** A win that stands, but never reached the win channel. */
  WinChannelPostFailed: "halloween.win_channel.post_failed",
} as const;

export type HalloweenLogEvent =
  (typeof HalloweenLogEvent)[keyof typeof HalloweenLogEvent];

/** A structured log line: winston keeps every field besides `message`. */
export interface HalloweenLogLine {
  event: HalloweenLogEvent;
  message: string;
  [field: string]: unknown;
}

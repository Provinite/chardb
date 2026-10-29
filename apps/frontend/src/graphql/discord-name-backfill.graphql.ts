import { gql } from "@apollo/client";

const DISCORD_NAME_BACKFILL_STATUS_FIELDS = gql`
  fragment DiscordNameBackfillStatusFields on DiscordNameBackfillStatus {
    running
    total
    processed
    updated
    notFound
    failed
    startedAt
    finishedAt
  }
`;

export const DISCORD_NAME_BACKFILL_STATUS = gql`
  query DiscordNameBackfillStatus {
    discordNameBackfillStatus {
      ...DiscordNameBackfillStatusFields
    }
  }
  ${DISCORD_NAME_BACKFILL_STATUS_FIELDS}
`;

export const RUN_DISCORD_NAME_BACKFILL = gql`
  mutation RunDiscordNameBackfill {
    runDiscordNameBackfill {
      ...DiscordNameBackfillStatusFields
    }
  }
  ${DISCORD_NAME_BACKFILL_STATUS_FIELDS}
`;

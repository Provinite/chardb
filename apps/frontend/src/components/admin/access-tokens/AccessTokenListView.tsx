import React from "react";
import { Button, Cluster, Stack } from "@chardb/ui";
import type { PersonalAccessTokenFieldsFragment } from "../../../generated/graphql";
import {
  accessTokenStatus,
  describeGlobalGrant,
  describeGrant,
} from "./accessTokenStatus";
import * as styles from "./AccessTokenListView.css";

export interface AccessTokenListViewProps {
  tokens: readonly PersonalAccessTokenFieldsFragment[];
  /** What "expired" is measured against. */
  now: Date;
  /** The token whose revocation is in flight. */
  revokingId?: string | null;
  onRevoke: (token: PersonalAccessTokenFieldsFragment) => void;
}

const STATUS_LABEL = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
} as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** A site admin's personal access tokens, newest first. */
export const AccessTokenListView: React.FC<AccessTokenListViewProps> = ({
  tokens,
  now,
  revokingId,
  onRevoke,
}) => {
  if (tokens.length === 0) {
    return (
      <p className={styles.empty}>
        No access tokens yet. Create one to let a script or agent act for you.
      </p>
    );
  }

  return (
    <Stack as="ul" gap="md" className={styles.list}>
      {tokens.map((token) => {
        const status = accessTokenStatus(token, now);
        return (
          <Stack
            as="li"
            gap="sm"
            key={token.id}
            className={styles.card}
            aria-label={token.name}
          >
            <Cluster gap="sm" justify="space-between">
              <Cluster gap="sm">
                <h3 className={styles.name}>{token.name}</h3>
                <span className={styles.hint}>…{token.displayHint}</span>
              </Cluster>
              <span className={styles.status[status]}>
                {STATUS_LABEL[status]}
              </span>
            </Cluster>

            <Stack as="ul" gap="xs" className={styles.list}>
              {token.globalPermissions.length > 0 && (
                <li className={styles.grant}>
                  <span className={styles.community}>Site permissions</span>:{" "}
                  {describeGlobalGrant(token.globalPermissions).join(", ")}
                </li>
              )}
              {token.communities.map((grant) => (
                <li key={grant.community.id} className={styles.grant}>
                  <span className={styles.community}>
                    {grant.community.name}
                  </span>
                  : {describeGrant(grant).join(", ")}
                </li>
              ))}
            </Stack>

            <dl className={styles.dates}>
              <div>
                <dt className={styles.dateTerm}>Created </dt>
                <dd className={styles.dateValue}>
                  {formatDate(token.createdAt)}
                </dd>
              </div>
              <div>
                <dt className={styles.dateTerm}>Last used </dt>
                <dd className={styles.dateValue}>
                  {token.lastUsedAt ? formatDate(token.lastUsedAt) : "Never"}
                </dd>
              </div>
              <div>
                <dt className={styles.dateTerm}>
                  {status === "expired" ? "Expired " : "Expires "}
                </dt>
                <dd className={styles.dateValue}>
                  {formatDate(token.expiresAt)}
                </dd>
              </div>
            </dl>

            <Cluster gap="sm" justify="flex-end">
              <Button
                tone="danger"
                size="sm"
                disabled={status !== "active"}
                busy={revokingId === token.id}
                onClick={() => onRevoke(token)}
              >
                Revoke
              </Button>
            </Cluster>
          </Stack>
        );
      })}
    </Stack>
  );
};

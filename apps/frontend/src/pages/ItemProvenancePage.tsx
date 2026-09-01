import React, { useState } from "react";
import styled, { css } from "styled-components";
import { useParams, Link, Navigate } from "react-router-dom";
import { Package, ArrowLeft, Lock, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import {
  ItemTransactionKind,
  useGetItemWithProvenanceQuery,
  useRevokeItemsMutation,
  type ItemTransactionFieldsFragment,
} from "../generated/graphql";
import {
  chainOfCustody,
  KIND_LABEL,
  kindTone,
  type KindTone,
} from "../lib/itemDisplay";

/**
 * One item's history.
 *
 * This is the page the public-provenance decision was for: before trading with
 * someone you can see where the thing they are offering actually came from.
 * Readable by any member of the community that owns the item's type — the
 * server enforces that; this page renders whatever it is given.
 *
 * A destroyed item still resolves here. That is the point of revoking softly:
 * the history a dispute needs is exactly the history a hard delete would take
 * with it.
 */

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 1.5rem;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const Swatch = styled.div<{ $hex?: string | null; $dim: boolean }>`
  width: 72px;
  height: 72px;
  border-radius: 16px;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $hex }) =>
    $hex ? `${$hex}22` : theme.colors.surface};
  color: ${({ theme, $hex }) => $hex || theme.colors.text.muted};
  opacity: ${({ $dim }) => ($dim ? 0.45 : 1)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.375rem 0;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  font-size: 0.9375rem;
`;

const Holder = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
`;

const Banner = styled.div<{ $tone: "danger" | "muted" }>`
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.45;
  margin-bottom: 1.5rem;

  ${({ $tone, theme }) => {
    const color =
      $tone === "danger" ? theme.colors.danger : theme.colors.text.muted;
    return css`
      border: 1px solid ${color};
      background: ${color}18;
      color: ${theme.colors.text.secondary};

      strong {
        color: ${color};
        display: block;
        margin-bottom: 0.125rem;
      }
    `;
  }}
`;

const Section = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-variant-numeric: tabular-nums;
`;

const Timeline = styled.ol`
  list-style: none;
  margin: 0;
  padding: 1.25rem 1.25rem 1.25rem 2.5rem;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 1.55rem;
    top: 1.75rem;
    bottom: 1.75rem;
    width: 2px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const Event = styled.li<{ $tone: KindTone }>`
  position: relative;
  padding-bottom: 1.25rem;

  &:last-child {
    padding-bottom: 0;
  }

  &::before {
    content: "";
    position: absolute;
    left: -1.19rem;
    top: 0.3rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.colors.background};
    background: ${({ theme, $tone }) =>
      $tone === "success"
        ? theme.colors.success
        : $tone === "danger"
          ? theme.colors.danger
          : $tone === "info"
            ? theme.colors.info
            : $tone === "warning"
              ? theme.colors.warning
              : theme.colors.text.muted};
  }
`;

const EventHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`;

const KindPill = styled.span<{ $tone: KindTone }>`
  display: inline-flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  padding: 0.1rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;

  ${({ $tone, theme }) => {
    const color =
      $tone === "success"
        ? theme.colors.success
        : $tone === "danger"
          ? theme.colors.danger
          : $tone === "info"
            ? theme.colors.info
            : $tone === "warning"
              ? theme.colors.warning
              : theme.colors.text.muted;
    return css`
      color: ${color};
      background: ${color}22;
    `;
  }}
`;

const When = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-variant-numeric: tabular-nums;
`;

const EventBody = styled.p`
  margin: 0.3rem 0 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;

  b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`;

const StaffNote = styled.span`
  display: flex;
  align-items: flex-start;
  gap: 0.3rem;
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    flex: none;
    margin-top: 0.2rem;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Empty = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

/* Timeline on the left, the facts that describe the item on the right. */
const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Side = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
  padding: 1rem;
  font-size: 0.875rem;
  align-items: baseline;

  dt {
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    white-space: nowrap;
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Custody = styled.ol`
  list-style: none;
  margin: 0;
  padding: 1rem 1rem 1rem 2.25rem;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 1.3rem;
    top: 1.4rem;
    bottom: 1.4rem;
    width: 2px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const Spell = styled.li<{ $current: boolean }>`
  position: relative;
  padding-bottom: 0.875rem;
  font-size: 0.875rem;

  &:last-child {
    padding-bottom: 0;
  }

  &::before {
    content: "";
    position: absolute;
    left: -1.19rem;
    top: 0.35rem;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.colors.background};
    background: ${({ theme, $current }) =>
      $current ? theme.colors.primary : theme.colors.text.muted};
  }

  .who {
    font-weight: ${({ $current }) => ($current ? 600 : 500)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .span {
    display: block;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.muted};
    font-variant-numeric: tabular-nums;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: auto;
`;

const Button = styled.button<{ $danger?: boolean }>`
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.45rem 0.85rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  border: 1px solid
    ${({ theme, $danger }) =>
      $danger ? theme.colors.danger : theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.danger : theme.colors.text.secondary};

  &:hover:not(:disabled) {
    background: ${({ theme, $danger }) =>
      $danger ? `${theme.colors.danger}12` : theme.colors.surface};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.danger : theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Dialog = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: ${({ theme }) => theme.shadows.lg};

  h2 {
    font-size: 1.125rem;
    margin: 0 0 0.5rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin: 0 0 1rem;
  }

  label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.text.muted};
    margin-bottom: 0.3rem;
  }

  input {
    width: 100%;
    font: inherit;
    font-size: 0.875rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 1rem;
  }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const name = (
  user: { username: string; displayName?: string | null } | null | undefined,
) => user?.displayName || user?.username || null;

/**
 * What the event says happened, in plain language.
 *
 * Phrased per kind rather than rendering a raw from/to pair: a grant has no
 * source and a revoke has no destination, so the generic form would print a
 * dash and leave the reader to work out which side was missing and why.
 */
const describe = (row: ItemTransactionFieldsFragment): React.ReactNode => {
  const actor = name(row.actorUser) || row.actorLabel || "someone";
  const from = name(row.fromUser);
  const to = name(row.toUser);

  switch (row.kind) {
    case ItemTransactionKind.Import:
      return (
        <>
          Already held when the ledger was introduced. Its earlier history was
          never recorded.
        </>
      );
    case ItemTransactionKind.Grant:
      return to ? (
        <>
          Granted to <b>{to}</b> by <b>{actor}</b>.
        </>
      ) : (
        <>
          Created by <b>{actor}</b>, held unclaimed until its recipient linked
          an account.
        </>
      );
    case ItemTransactionKind.Claim:
      return (
        <>
          Claimed by <b>{to}</b> after linking an external account.
        </>
      );
    case ItemTransactionKind.Transfer:
      return (
        <>
          Traded from <b>{from}</b> to <b>{to}</b>.
        </>
      );
    case ItemTransactionKind.Use:
      return (
        <>
          Redeemed by <b>{from ?? actor}</b>.
        </>
      );
    case ItemTransactionKind.Revoke:
      return (
        <>
          Revoked from <b>{from}</b> by <b>{actor}</b>.
        </>
      );
    default:
      return null;
  }
};

export const ItemProvenancePage: React.FC = () => {
  const { communityId, itemId } = useParams<{
    communityId: string;
    itemId: string;
  }>();
  const { permissions } = useUserCommunityRole(communityId);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [staffNote, setStaffNote] = useState("");

  const { data, loading, error, refetch } = useGetItemWithProvenanceQuery({
    variables: { itemId: itemId! },
    skip: !itemId,
  });

  const [revokeItems, { loading: revoking }] = useRevokeItemsMutation();

  if (loading && !data) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  if (error || !data?.item) {
    return (
      <Container>
        <Empty>
          <Package
            size={36}
            style={{ opacity: 0.5, marginBottom: "0.75rem" }}
          />
          <p>
            That item could not be loaded. It may not exist, or it may belong to
            a community you are not a member of.
          </p>
        </Empty>
      </Container>
    );
  }

  const item = data.item;
  const history = data.itemProvenance;
  const community = item.itemType.community;

  // The route carries a community so the page sits inside that community's
  // navigation. If the URL names the wrong one, send the reader to the right
  // address rather than showing them a sidebar for a community this item has
  // nothing to do with.
  if (community && communityId !== community.id) {
    return (
      <Navigate to={`/communities/${community.id}/items/${item.id}`} replace />
    );
  }

  const destroyed = Boolean(item.destroyedAt);
  const holder = name(item.owner);
  const custody = chainOfCustody(history);
  const first = history.length ? history[0] : null;
  const latest = history.length ? history[history.length - 1] : null;

  const origin =
    first?.kind === ItemTransactionKind.Import
      ? "Predates the ledger"
      : first
        ? KIND_LABEL[first.kind]
        : "Unknown";

  const submitRevoke = async () => {
    try {
      await revokeItems({
        variables: {
          itemIds: [item.id],
          reason: reason.trim(),
          staffNote: staffNote.trim() || undefined,
        },
      });
      toast.success("Item revoked");
      setRevokeOpen(false);
      setReason("");
      setStaffNote("");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke the item");
    }
  };

  return (
    <Container>
      <BackLink to={`/item-types/${item.itemType.id}`}>
        <ArrowLeft size={15} /> {item.itemType.name}
      </BackLink>

      <Header>
        <Swatch $hex={item.itemType.color?.hexCode} $dim={destroyed}>
          {item.itemType.image ? (
            <img
              src={
                item.itemType.image.thumbnailUrl ||
                item.itemType.image.originalUrl
              }
              alt={item.itemType.image.altText || item.itemType.name}
            />
          ) : (
            <Package size={30} />
          )}
        </Swatch>
        <div>
          <Title>{item.itemType.name}</Title>
          <Subtitle data-testid="item-status">
            {destroyed ? (
              <>No longer in circulation</>
            ) : holder ? (
              <>
                Held by <Holder>{holder}</Holder>
              </>
            ) : (
              <>Awaiting a claim</>
            )}
            {item.itemType.category
              ? ` \u00b7 ${item.itemType.category}`
              : null}
          </Subtitle>
        </div>

        {permissions.canGrantItems && !destroyed && (
          <Actions>
            <Button
              $danger
              type="button"
              data-testid="revoke-item"
              onClick={() => setRevokeOpen(true)}
            >
              <Trash2 size={14} /> Revoke
            </Button>
          </Actions>
        )}
      </Header>

      {destroyed && (
        <Banner $tone="danger" data-testid="item-destroyed-banner">
          <Lock size={15} style={{ marginTop: "0.15rem", flex: "none" }} />
          <div>
            <strong>This item was destroyed</strong>
            {latest?.reason
              ? `${formatWhen(item.destroyedAt as string)} \u2014 ${latest.reason}`
              : formatWhen(item.destroyedAt as string)}
          </div>
        </Banner>
      )}

      {!destroyed && !holder && (
        <Banner $tone="muted">
          <Package size={15} style={{ marginTop: "0.15rem", flex: "none" }} />
          <div>
            <strong>Nobody holds this yet</strong>
            It was granted to an external account that has not been linked. It
            becomes its recipient's the moment they link it.
          </div>
        </Banner>
      )}

      <Columns>
        <Section>
          <SectionHead>
            <SectionTitle>History</SectionTitle>
            <Hint>
              {history.length} event{history.length === 1 ? "" : "s"}
            </Hint>
          </SectionHead>

          {history.length === 0 ? (
            <Empty>
              Nothing has happened to this item yet, which should not be
              possible \u2014 every item gets at least one entry when it
              appears.
            </Empty>
          ) : (
            <Timeline>
              {/* Oldest first: a history reads forwards, unlike the ledger,
                  which is a feed and reads newest first. */}
              {history.map((row) => (
                <Event
                  key={row.id}
                  $tone={kindTone(row.kind)}
                  data-testid="provenance-event"
                  data-kind={row.kind}
                >
                  <EventHead>
                    <KindPill $tone={kindTone(row.kind)}>
                      {KIND_LABEL[row.kind]}
                    </KindPill>
                    <When>{formatWhen(row.createdAt)}</When>
                  </EventHead>
                  <EventBody>
                    {describe(row)}
                    {row.reason && row.kind !== ItemTransactionKind.Import ? (
                      <> {row.reason}</>
                    ) : null}
                    {row.staffNote && (
                      <StaffNote>
                        <Lock size={11} />
                        <span>{row.staffNote}</span>
                      </StaffNote>
                    )}
                  </EventBody>
                </Event>
              ))}
            </Timeline>
          )}
        </Section>

        <Side>
          <Section data-testid="chain-of-custody">
            <SectionHead>
              <SectionTitle>Chain of custody</SectionTitle>
              <Hint>
                {custody.length} holder{custody.length === 1 ? "" : "s"}
              </Hint>
            </SectionHead>
            {custody.length === 0 ? (
              <Empty>Nobody has held this item.</Empty>
            ) : (
              <Custody>
                {/* Newest first, so who has it now reads at the top. */}
                {[...custody].reverse().map((spell, i) => (
                  <Spell key={`${spell.since}-${i}`} $current={!spell.until}>
                    <span className="who">
                      {name(spell.holder) ?? "Awaiting a claim"}
                    </span>
                    <span className="span">
                      {spell.until
                        ? `${formatWhen(spell.since)} \u2013 ${formatWhen(spell.until)}`
                        : `since ${formatWhen(spell.since)}`}
                      {spell.endedByDestruction ? " (destroyed)" : ""}
                    </span>
                  </Spell>
                ))}
              </Custody>
            )}
          </Section>

          <Section data-testid="item-facts">
            <SectionHead>
              <SectionTitle>This item</SectionTitle>
            </SectionHead>
            <Facts>
              <dt>Origin</dt>
              <dd>{origin}</dd>
              <dt>First seen</dt>
              <dd>{first ? formatWhen(first.createdAt) : "\u2014"}</dd>
              <dt>Tradeable</dt>
              <dd>{item.itemType.isTradeable ? "Yes" : "No"}</dd>
              <dt>Consumable</dt>
              <dd>{item.itemType.isConsumable ? "Yes" : "No"}</dd>
              {community && (
                <>
                  <dt>Community</dt>
                  <dd>
                    <Link to={`/communities/${community.id}`}>
                      {community.name}
                    </Link>
                  </dd>
                </>
              )}
            </Facts>
          </Section>
        </Side>
      </Columns>

      {revokeOpen && (
        <Backdrop
          onClick={(e) => e.target === e.currentTarget && setRevokeOpen(false)}
        >
          <Dialog role="dialog" aria-modal="true" aria-label="Revoke item">
            <h2>Revoke this item</h2>
            <p>
              It will leave {holder ?? "its holder"}'s inventory and cannot be
              used or traded. Its history stays readable, including the reason
              you give here.
            </p>

            <label htmlFor="revoke-reason">Reason (shown to members)</label>
            <input
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate payout from a bot retry"
            />

            <label htmlFor="revoke-staff-note">Staff note (private)</label>
            <input
              id="revoke-staff-note"
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder="Optional. Never shown to members."
            />

            <DialogActions>
              <Button type="button" onClick={() => setRevokeOpen(false)}>
                Cancel
              </Button>
              <Button
                $danger
                type="button"
                data-testid="confirm-revoke"
                disabled={!reason.trim() || revoking}
                onClick={submitRevoke}
              >
                {revoking ? "Revoking\u2026" : "Revoke item"}
              </Button>
            </DialogActions>
          </Dialog>
        </Backdrop>
      )}
    </Container>
  );
};

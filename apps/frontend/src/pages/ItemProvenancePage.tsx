import React from "react";
import styled, { css } from "styled-components";
import { useParams, Link } from "react-router-dom";
import { Package, ArrowLeft, Lock } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  ItemTransactionKind,
  useGetItemWithProvenanceQuery,
  type ItemTransactionFieldsFragment,
} from "../generated/graphql";
import { KIND_LABEL, kindTone, type KindTone } from "../lib/itemDisplay";

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
          Used by <b>{from ?? actor}</b>.
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
  const { itemId } = useParams<{ itemId: string }>();

  const { data, loading, error } = useGetItemWithProvenanceQuery({
    variables: { itemId: itemId! },
    skip: !itemId,
  });

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
  const destroyed = Boolean(item.destroyedAt);
  const holder = name(item.owner);

  // The history is oldest-first, so the last event is the most recent thing
  // that happened to this item.
  const latest = history.length ? history[history.length - 1] : null;

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
            {item.itemType.category ? ` · ${item.itemType.category}` : null}
          </Subtitle>
        </div>
      </Header>

      {destroyed && (
        <Banner $tone="danger" data-testid="item-destroyed-banner">
          <Lock size={15} style={{ marginTop: "0.15rem", flex: "none" }} />
          <div>
            <strong>This item was destroyed</strong>
            {latest?.reason
              ? `${formatWhen(item.destroyedAt as string)} — ${latest.reason}`
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

      <Section>
        <SectionHead>
          <SectionTitle>History</SectionTitle>
          <Hint>
            {history.length} event{history.length === 1 ? "" : "s"}
          </Hint>
        </SectionHead>

        {history.length === 0 ? (
          <Empty>
            Nothing has happened to this item yet, which should not be possible
            — every item gets at least one entry when it appears.
          </Empty>
        ) : (
          <Timeline>
            {/* Oldest first: a history reads forwards, unlike the ledger, which
                is a feed and reads newest first. */}
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
    </Container>
  );
};

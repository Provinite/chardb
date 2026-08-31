import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownUp } from "lucide-react";
import { Button, Input } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import {
  useTradeComposerQuery,
  useTradeQuery,
  useProposeTradeMutation,
  useCounterTradeMutation,
} from "../graphql/trades.graphql";

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 0.25rem;
`;

const Sub = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const Panes = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 0.85rem;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const PaneHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.8125rem;
  font-weight: 600;
`;

const Hint = styled.span`
  font-size: 0.6875rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const PaneBody = styled.div`
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const Pick = styled.button<{ $on?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 0.875rem;
  padding: 0.5rem 0.6rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $on }) =>
    $on ? `${theme.colors.primary}14` : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Qty = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Lock = styled.span`
  margin-left: auto;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.error};
`;

const Side = styled.div<{ $mine?: boolean }>`
  border: 1px solid
    ${({ theme, $mine }) =>
      $mine ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  padding: 0.7rem;
`;

const SideHead = styled.h2`
  margin: 0 0 0.5rem;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
`;

/**
 * A divider inside a pane, between the items and the characters.
 *
 * They are different enough to be worth separating: an item is a name and a
 * count, a character is somebody with a page. Without the break the two run
 * together into one list where a character reads as a strangely-named item.
 */
const GroupHead = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.6rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};

  /* Nothing above it to divide from, when a member holds only characters. */
  &:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.875rem;

  & + & {
    margin-top: 0.35rem;
  }
`;

const Stepper = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  button {
    width: 22px;
    height: 22px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.background};
    color: inherit;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1;
  }
`;

/** Coin is a price, so it gets a field rather than a row of its own. */
const Price = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.8125rem;

  input {
    margin-left: auto;
    width: 110px;
    text-align: right;
  }
`;

const Swap = styled.div`
  display: flex;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  padding: 0.4rem 0;
`;

const SideEmpty = styled.p`
  margin: 0;
  padding: 0.75rem 0;
  text-align: center;
  font-size: 0.8125rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Foot = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-top: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const Problem = styled.div`
  flex: 1 1 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.error}12;
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
`;

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  min-height: 300px;
  align-items: center;
`;

/**
 * Build an offer.
 *
 * The asymmetry between the two panes is the point. What you offer is specific
 * rows, because you are here and can choose. What you ask for is a type and a
 * count, because any of theirs will do and pinning one would make the offer
 * fail the moment they trade that copy away.
 *
 * Characters do not have that asymmetry and cannot be made to. There is one of
 * each, so both sides name the character itself and both are a plain set. The
 * offer does become the fragile kind the item panes are shaped to avoid -- if
 * they trade that character away first, the offer fails at settlement -- but
 * that is what asking for a particular character means, and there is no
 * looser way to ask for one.
 */
export const TradeComposerPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const themId = params.get("with") ?? "";
  /** A declined offer to open the table from, set by the Counter button. */
  const mirrorId = params.get("mirror") ?? "";
  /**
   * A character to open the table wanting, set by the button on a character
   * page. Always lands on the asking side: the button renders only on
   * characters the viewer does not own, so arriving here is bidding for one.
   */
  const seedCharacterId = params.get("character") ?? "";

  /** Item ids I am handing over. */
  const [offering, setOffering] = useState<Set<string>>(new Set());
  /** itemTypeId -> how many of theirs I want. */
  const [requesting, setRequesting] = useState<Map<string, number>>(new Map());
  /** Character ids I am handing over. */
  const [offeringCharacters, setOfferingCharacters] = useState<Set<string>>(
    new Set(),
  );
  /** Character ids of theirs I am asking for. */
  const [requestingCharacters, setRequestingCharacters] = useState<Set<string>>(
    new Set(),
  );
  const [coinOut, setCoinOut] = useState("");
  const [coinIn, setCoinIn] = useState("");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const { data, loading } = useTradeComposerQuery({
    variables: { communityId: communityId!, meId: user?.id ?? "", themId },
    skip: !communityId || !user?.id || !themId,
  });

  const { data: mirrorData, loading: mirroring } = useTradeQuery({
    variables: { id: mirrorId },
    skip: !mirrorId,
  });

  const [proposeTrade, { loading: proposing }] = useProposeTradeMutation();
  const [counterTrade, { loading: countering }] = useCounterTradeMutation();
  const sending = proposing || countering;

  // Memoised because `?? []` mints a new array on every render before the
  // query resolves, which would make the useMemo below recompute each time.
  const mine = useMemo(() => data?.mine.holdings ?? [], [data]);
  const theirs = useMemo(() => data?.theirs.holdings ?? [], [data]);
  // Already filtered to the tradeable ones by the query. A character that is
  // not open to trades is not a greyed-out choice here, it is absent -- the
  // flag is a standing answer to being asked, and showing it at all would be
  // the asking it exists to prevent.
  const myCharacters = useMemo(
    () => data?.myCharacters.characters ?? [],
    [data],
  );
  const theirCharacters = useMemo(
    () => data?.theirCharacters.characters ?? [],
    [data],
  );
  // Two ways a currency you hold cannot price an offer. Archived ones keep
  // their balances and stay readable but refuse new transactions; untradeable
  // ones are fully alive and merely cannot move between members. Either way,
  // offering it would be rejected at send with a message the member can do
  // nothing about, so neither reaches the picker.
  const balances = useMemo(
    () =>
      (data?.wallet.balances ?? []).filter(
        (b) => !b.currency.archivedAt && b.currency.isTradeable,
      ),
    [data],
  );
  // Default to whichever currency they actually hold most of. Taking the first
  // one the wallet happens to return offers a price field reading "0 FT" to
  // someone sitting on 380 HC, which is a worse guess than no guess.
  const richest = useMemo(
    () => [...balances].sort((a, b) => b.amount - a.amount)[0],
    [balances],
  );
  const currency =
    balances.find((b) => b.currency.id === currencyId) ?? richest;

  // Countering opens the composer on the same table with the sides swapped, so
  // that "not quite" is an edit rather than a retype. Seeded once and never
  // again: after the first pass the state belongs to the member, and a refetch
  // must not quietly undo what they changed.
  const seeded = useRef(false);
  useEffect(() => {
    const mirror = mirrorData?.trade;
    if (seeded.current || !mirror || !data || !user) return;
    seeded.current = true;

    const wants = new Map<string, number>();
    const gives = new Set<string>();
    // My rows, per type, to draw from as the mirrored requests are filled.
    const spare = new Map<string, string[]>(
      mine
        .filter((h) => h.itemType.isTradeable)
        .map((h) => [h.itemType.id, h.items.map((i) => i.id)]),
    );

    for (const line of mirror.items) {
      const typeId = line.item?.itemTypeId ?? line.itemType?.id;
      if (!typeId) continue;
      const count = line.quantity ?? 1;

      if (line.destinationUser.id === user.id) {
        // Was coming to me, so I ask for it again -- by type, because their
        // particular row was never mine to pin and the composer asks in types.
        // Clamped to what they hold now, which silently drops anything they
        // have since traded away rather than seeding an offer that cannot fill.
        const held = theirs.find((h) => h.itemType.id === typeId);
        if (!held?.itemType.isTradeable) continue;
        wants.set(
          typeId,
          Math.min((wants.get(typeId) ?? 0) + count, held.count),
        );
      } else if (line.sourceUser.id === user.id) {
        // Was being asked of me by type, so now I pick the actual rows.
        for (const id of (spare.get(typeId) ?? []).splice(0, count)) {
          gives.add(id);
        }
      }
    }

    // Characters carry across as themselves, in whichever direction they were
    // already going. Clamped to what each side still holds and still has open
    // to trades, which drops a character sold or closed since the original
    // rather than seeding a table that cannot be sent.
    const characterGives = new Set<string>();
    const characterWants = new Set<string>();
    for (const line of mirror.characterLines) {
      if (
        line.destinationUser.id === user.id &&
        theirCharacters.some((c) => c.id === line.character.id)
      ) {
        characterWants.add(line.character.id);
      } else if (
        line.sourceUser.id === user.id &&
        myCharacters.some((c) => c.id === line.character.id)
      ) {
        characterGives.add(line.character.id);
      }
    }

    for (const line of mirror.currencyLines) {
      if (line.sourceUser.id === user.id) {
        setCurrencyId(line.currency.id);
        setCoinOut(String(line.amount));
      } else if (line.destinationUser.id === user.id) {
        setCurrencyId(line.currency.id);
        setCoinIn(String(line.amount));
      }
    }

    setRequesting(wants);
    setOffering(gives);
    setRequestingCharacters(characterWants);
    setOfferingCharacters(characterGives);
  }, [mirrorData, data, mine, theirs, myCharacters, theirCharacters, user]);

  // The character page's button, landing on the asking side. Dropped unless
  // the member being traded with actually holds it and has it open -- a
  // hand-made URL naming someone else's character would otherwise seed a table
  // the server refuses, and blame the member for it at send.
  const characterSeeded = useRef(false);
  useEffect(() => {
    if (characterSeeded.current || !seedCharacterId || !data) return;
    characterSeeded.current = true;
    if (!theirCharacters.some((c) => c.id === seedCharacterId)) return;
    setRequestingCharacters((prev) => new Set(prev).add(seedCharacterId));
  }, [seedCharacterId, data, theirCharacters]);

  const toggleOffer = useCallback((itemId: string) => {
    setOffering((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  /**
   * Toggle a character on or off one side.
   *
   * The same handler for both, where items need a toggle and a stepper. A
   * character is on the table or it is not; there is no third state a count
   * could express.
   */
  const toggleCharacter = useCallback(
    (
      setSide: React.Dispatch<React.SetStateAction<Set<string>>>,
      characterId: string,
    ) => {
      setSide((prev) => {
        const next = new Set(prev);
        if (next.has(characterId)) next.delete(characterId);
        else next.add(characterId);
        return next;
      });
    },
    [],
  );

  const bumpRequest = useCallback((typeId: string, by: number, max: number) => {
    setRequesting((prev) => {
      const next = new Map(prev);
      const value = (next.get(typeId) ?? 0) + by;
      if (value <= 0) next.delete(typeId);
      else next.set(typeId, Math.min(value, max));
      return next;
    });
  }, []);

  const out = Number(coinOut) || 0;
  const back = Number(coinIn) || 0;
  const net = out - back;
  const overdrawn = currency ? out > currency.amount : out > 0;
  const empty =
    offering.size === 0 &&
    requesting.size === 0 &&
    offeringCharacters.size === 0 &&
    requestingCharacters.size === 0 &&
    out === 0 &&
    back === 0;

  const offeredRows = useMemo(
    () =>
      mine.flatMap((h) =>
        h.items
          .filter((i) => offering.has(i.id))
          .map((i) => ({ id: i.id, name: h.itemType.name })),
      ),
    [mine, offering],
  );

  const offeredCharacters = useMemo(
    () => myCharacters.filter((c) => offeringCharacters.has(c.id)),
    [myCharacters, offeringCharacters],
  );
  const requestedCharacters = useMemo(
    () => theirCharacters.filter((c) => requestingCharacters.has(c.id)),
    [theirCharacters, requestingCharacters],
  );

  const send = useCallback(async () => {
    setProblem(null);
    try {
      // Coin goes over as both halves; the server nets them into one line, so
      // "250 out, 100 back" arrives stored as 150 one way.
      const coin = [
        ...(out > 0 && currency
          ? [
              {
                currencyId: currency.currency.id,
                amount: out,
                fromProposer: true,
              },
            ]
          : []),
        ...(back > 0 && currency
          ? [
              {
                currencyId: currency.currency.id,
                amount: back,
                fromProposer: false,
              },
            ]
          : []),
      ];

      const input = {
        communityId: communityId as string,
        recipientId: themId,
        offering: [...offering].map((itemId) => ({ itemId })),
        requesting: [...requesting.entries()].map(([itemTypeId, quantity]) => ({
          itemTypeId,
          quantity,
        })),
        offeringCharacters: [...offeringCharacters].map((characterId) => ({
          characterId,
        })),
        requestingCharacters: [...requestingCharacters].map((characterId) => ({
          characterId,
        })),
        coin,
        note: note.trim() || undefined,
      };

      // Countering declines the offer it answers, and does it here rather than
      // on the Counter button so that opening the composer and abandoning it
      // leaves the original standing.
      const id = mirrorId
        ? (await counterTrade({ variables: { id: mirrorId, input } })).data
            ?.counterTrade.id
        : (await proposeTrade({ variables: { input } })).data?.proposeTrade.id;

      if (id) navigate(`/communities/${communityId}/trades/${id}`);
    } catch (err) {
      setProblem(
        err instanceof Error ? err.message : "That offer could not be sent",
      );
    }
  }, [
    out,
    back,
    currency,
    proposeTrade,
    counterTrade,
    mirrorId,
    communityId,
    themId,
    offering,
    requesting,
    offeringCharacters,
    requestingCharacters,
    note,
    navigate,
  ]);

  if (!themId) {
    return (
      <Container>
        <SideEmpty>Pick someone to trade with first.</SideEmpty>
      </Container>
    );
  }

  // A counter waits for the offer it mirrors too, or the panes would render
  // empty and then fill themselves a moment later under the member's cursor.
  if ((loading && !data) || (mirroring && !mirrorData)) {
    return (
      <LoadingWrap>
        <LoadingSpinner />
      </LoadingWrap>
    );
  }

  return (
    <Container>
      <Title>{mirrorId ? "Counter-offer" : "New trade offer"}</Title>
      <Sub>
        {mirrorId
          ? "Their offer, now yours to edit. Theirs stands until you send this, and sending it declines theirs."
          : "Nothing moves until they accept, and everything is checked again at that moment."}
      </Sub>

      {balances.length > 1 && (
        <Sub as="div" style={{ marginBottom: "1rem" }}>
          {/* One currency per offer for now. The schema can carry several, and
              the server nets each separately, but a composer that priced one
              side in coin and the other in event chits would be a market
              before it was a feature. */}
          <label>
            Coin{" "}
            <select
              value={currency?.currency.id ?? ""}
              data-testid="coin-picker"
              onChange={(e) => setCurrencyId(e.target.value)}
            >
              {balances.map((b) => (
                <option key={b.currency.id} value={b.currency.id}>
                  {b.currency.name} · {b.amount.toLocaleString()}{" "}
                  {b.currency.code}
                </option>
              ))}
            </select>
          </label>
        </Sub>
      )}

      <Panes>
        <Pane>
          <PaneHead>
            Yours <Hint>tap to offer</Hint>
          </PaneHead>
          <PaneBody>
            {mine.length === 0 && myCharacters.length === 0 && (
              <SideEmpty>You hold nothing here.</SideEmpty>
            )}
            {mine.flatMap((h) =>
              // A tradeable type is one row per copy, because which copy you
              // hand over is yours to decide. An untradeable one collapses to a
              // single locked line: you cannot pick any of them, and thirty
              // identical rows would push what you can offer off the bottom of
              // the pane. It stays visible rather than hidden so the member can
              // see it is theirs and see why it will not move.
              h.itemType.isTradeable
                ? h.items.map((item) => (
                    <Pick
                      key={item.id}
                      type="button"
                      $on={offering.has(item.id)}
                      onClick={() => toggleOffer(item.id)}
                      data-testid="offer-pick"
                      data-item-id={item.id}
                      data-item-type-id={h.itemType.id}
                      data-tradeable="true"
                    >
                      <span>{h.itemType.name}</span>
                      <Qty>{offering.has(item.id) ? "on table" : "offer"}</Qty>
                    </Pick>
                  ))
                : [
                    <Pick
                      key={h.itemType.id}
                      type="button"
                      disabled
                      data-testid="offer-pick"
                      data-item-type-id={h.itemType.id}
                      data-tradeable="false"
                    >
                      <span>{h.itemType.name}</span>
                      <Lock>locked{h.count > 1 ? ` ×${h.count}` : ""}</Lock>
                    </Pick>,
                  ],
            )}

            {/* Only the ones you have opened to trades. A closed character is
                absent rather than locked, unlike an untradeable item type:
                the item is locked by staff and you would wonder where it
                went, while this one is closed by you and its absence is the
                setting doing what you set it to. */}
            {myCharacters.length > 0 && <GroupHead>Characters</GroupHead>}
            {myCharacters.map((c) => (
              <Pick
                key={c.id}
                type="button"
                $on={offeringCharacters.has(c.id)}
                onClick={() => toggleCharacter(setOfferingCharacters, c.id)}
                data-testid="offer-character-pick"
                data-character-id={c.id}
              >
                <span>{c.name}</span>
                <Qty>
                  {offeringCharacters.has(c.id) ? "on table" : "offer"}
                </Qty>
              </Pick>
            ))}
          </PaneBody>
        </Pane>

        <Pane>
          <PaneHead>The table</PaneHead>
          <PaneBody>
            <Side $mine data-testid="table-give">
              <SideHead>You give</SideHead>
              {offeredRows.length === 0 && offeredCharacters.length === 0 ? (
                <SideEmpty>Nothing offered</SideEmpty>
              ) : (
                <>
                  {offeredRows.map((row) => (
                    <Row key={row.id}>
                      <span>{row.name}</span>
                      <Stepper>
                        <button
                          type="button"
                          aria-label={`Remove ${row.name}`}
                          onClick={() => toggleOffer(row.id)}
                        >
                          ×
                        </button>
                      </Stepper>
                    </Row>
                  ))}
                  {offeredCharacters.map((c) => (
                    <Row key={c.id} data-testid="table-give-character">
                      <span>{c.name}</span>
                      <Stepper>
                        <button
                          type="button"
                          aria-label={`Remove ${c.name}`}
                          onClick={() =>
                            toggleCharacter(setOfferingCharacters, c.id)
                          }
                        >
                          ×
                        </button>
                      </Stepper>
                    </Row>
                  ))}
                </>
              )}
              {currency && (
                <Price>
                  <span>plus</span>
                  <strong>{currency.currency.code}</strong>
                  <Input
                    type="number"
                    min={0}
                    max={currency.amount}
                    value={coinOut}
                    placeholder="0"
                    aria-label={`${currency.currency.name} you give`}
                    onChange={(e) => setCoinOut(e.target.value)}
                  />
                </Price>
              )}
            </Side>

            <Swap>
              <ArrowDownUp size={16} />
            </Swap>

            <Side data-testid="table-receive">
              <SideHead>You receive</SideHead>
              {requesting.size === 0 && requestedCharacters.length === 0 ? (
                <SideEmpty>Nothing requested</SideEmpty>
              ) : (
                <>
                  {[...requesting.entries()].map(([typeId, qty]) => {
                    const held = theirs.find((h) => h.itemType.id === typeId);
                    return (
                      <Row key={typeId}>
                        <span>{held?.itemType.name ?? "Item"}</span>
                        <Stepper>
                          <button
                            type="button"
                            aria-label="Fewer"
                            onClick={() =>
                              bumpRequest(typeId, -1, held?.count ?? 1)
                            }
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            aria-label="More"
                            onClick={() =>
                              bumpRequest(typeId, 1, held?.count ?? 1)
                            }
                          >
                            +
                          </button>
                        </Stepper>
                      </Row>
                    );
                  })}
                  {/* A remove button and no stepper, where the item rows above
                      have both. There is one of this character, so a count
                      would be a control whose only legal value is the one it
                      already shows. */}
                  {requestedCharacters.map((c) => (
                    <Row key={c.id} data-testid="table-receive-character">
                      <span>{c.name}</span>
                      <Stepper>
                        <button
                          type="button"
                          aria-label={`Remove ${c.name}`}
                          onClick={() =>
                            toggleCharacter(setRequestingCharacters, c.id)
                          }
                        >
                          ×
                        </button>
                      </Stepper>
                    </Row>
                  ))}
                </>
              )}
              {currency && (
                <Price>
                  <span>plus</span>
                  <strong>{currency.currency.code}</strong>
                  <Input
                    type="number"
                    min={0}
                    value={coinIn}
                    placeholder="0"
                    aria-label={`${currency.currency.name} you receive`}
                    onChange={(e) => setCoinIn(e.target.value)}
                  />
                </Price>
              )}
            </Side>
          </PaneBody>
        </Pane>

        <Pane>
          <PaneHead>
            {/* Was "any copy will do", which is true of the items and false of
                the characters below them. A hint that is right about half a
                pane is worse than one that only says what to do with it. */}
            Theirs <Hint>tap to ask for</Hint>
          </PaneHead>
          <PaneBody>
            {theirs.length === 0 && theirCharacters.length === 0 && (
              <SideEmpty>They hold nothing here.</SideEmpty>
            )}
            {theirs.map((h) => (
              <Pick
                key={h.itemType.id}
                type="button"
                $on={requesting.has(h.itemType.id)}
                disabled={!h.itemType.isTradeable}
                onClick={() => bumpRequest(h.itemType.id, 1, h.count)}
                data-testid="request-pick"
                data-item-type-id={h.itemType.id}
                data-tradeable={h.itemType.isTradeable ? "true" : "false"}
              >
                <span>{h.itemType.name}</span>
                {h.itemType.isTradeable ? (
                  <Qty>×{h.count}</Qty>
                ) : (
                  <Lock>locked</Lock>
                )}
              </Pick>
            ))}

            {/* Named, where the items above are asked for by type. There is
                no looser way to ask for a character, so this is the one line
                kind that fails at settlement if they part with it first. */}
            {theirCharacters.length > 0 && <GroupHead>Characters</GroupHead>}
            {theirCharacters.map((c) => (
              <Pick
                key={c.id}
                type="button"
                $on={requestingCharacters.has(c.id)}
                onClick={() => toggleCharacter(setRequestingCharacters, c.id)}
                data-testid="request-character-pick"
                data-character-id={c.id}
              >
                <span>{c.name}</span>
                <Qty>
                  {requestingCharacters.has(c.id) ? "on table" : "ask for"}
                </Qty>
              </Pick>
            ))}
          </PaneBody>
        </Pane>
      </Panes>

      <Foot>
        {problem && <Problem role="alert">{problem}</Problem>}
        {overdrawn && currency && (
          <Problem role="alert">
            You are offering {out.toLocaleString()} {currency.currency.code}{" "}
            against a balance of {currency.amount.toLocaleString()}.
          </Problem>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {net !== 0 && currency && (
            <Sub style={{ margin: "0.5rem 0 0" }}>
              Net {Math.abs(net).toLocaleString()} {currency.currency.code}{" "}
              {net > 0 ? "from you" : "to you"} — sent as a single amount.
            </Sub>
          )}
        </div>
        <Button
          variant="primary"
          disabled={empty || overdrawn || sending}
          onClick={send}
          data-testid="send-offer"
        >
          {mirrorId ? "Send counter" : "Send offer"}
        </Button>
      </Foot>
    </Container>
  );
};

import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { Button } from "@chardb/ui";
import {
  useGetCurrenciesQuery,
  useSetItemTypeUsePayoutMutation,
  type ItemTypeFieldsFragment,
} from "../../generated/graphql";

const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 0.9rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const Head = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};

  input[type="number"] {
    margin-left: auto;
    width: 7rem;
    padding: 0.3rem 0.45rem;
    text-align: right;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.sm};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
    font-variant-numeric: tabular-nums;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

interface Props {
  itemType: ItemTypeFieldsFragment;
  communityId: string;
}

/**
 * What using one of these pays its holder.
 *
 * Only for consumable types, and it says why rather than hiding: using is what
 * destroys the item, and a payout on something that is never used up would pay
 * out every time it was pressed. Refusing at save would be a worse place to
 * find that out than here.
 *
 * Archived currencies are left out entirely. They cannot be created, so a
 * payout naming one is a reward that never arrives -- the server refuses it,
 * and offering it here would only mean explaining the refusal afterwards.
 */
export const ItemUsePayoutEditor: React.FC<Props> = ({
  itemType,
  communityId,
}) => {
  const { data } = useGetCurrenciesQuery({
    variables: { communityId, includeArchived: false },
    skip: !communityId,
  });
  const [save, { loading }] = useSetItemTypeUsePayoutMutation();

  const currencies = useMemo(() => data?.currencies ?? [], [data]);

  // Keyed by currency, as strings, because an empty box is a real state and
  // 0 is not the same as "not paying this one".
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      itemType.usePayout.map((c) => [c.currency.id, String(c.amount)]),
    ),
  );

  if (!itemType.isConsumable) {
    return (
      <Wrap>
        <Head>Pays on use</Head>
        <Hint>
          Only a consumable item can pay out. Using is what uses it up, and
          without that the payout could be collected over and over from the same
          item.
        </Hint>
      </Wrap>
    );
  }

  const components = Object.entries(amounts)
    .map(([currencyId, raw]) => ({ currencyId, amount: Number(raw) }))
    .filter((c) => Number.isFinite(c.amount) && c.amount > 0);

  const onSave = async () => {
    try {
      await save({
        variables: { itemTypeId: itemType.id, components },
      });
      toast.success(components.length ? "Payout saved" : "Payout cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that");
    }
  };

  return (
    <Wrap data-testid="use-payout-editor">
      <Head>Pays on use</Head>
      <Hint>
        Using one destroys it and pays the holder this. Leave everything blank
        to pay nothing.
      </Hint>

      {currencies.length === 0 ? (
        <Hint>This community has no currencies to pay out yet.</Hint>
      ) : (
        currencies.map((currency) => (
          <Row key={currency.id}>
            <span>
              {currency.name} ({currency.symbol || currency.code})
            </span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="0"
              value={amounts[currency.id] ?? ""}
              data-testid={`payout-amount-${currency.id}`}
              onChange={(e) =>
                setAmounts((prev) => ({
                  ...prev,
                  [currency.id]: e.target.value,
                }))
              }
            />
          </Row>
        ))
      )}

      <Actions>
        <Button
          size="sm"
          onClick={onSave}
          disabled={loading}
          data-testid="save-use-payout"
        >
          {loading ? "Saving…" : "Save payout"}
        </Button>
      </Actions>
    </Wrap>
  );
};

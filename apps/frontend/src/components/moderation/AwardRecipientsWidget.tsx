import React from "react";
import styled from "styled-components";
import { Coins } from "lucide-react";
import { MediaAwardRelation } from "../../generated/graphql";
import { formatAmount } from "../../lib/currencyDisplay";

/**
 * Who could be paid for an upload, and how much to pay them.
 *
 * Rendered only when the server returns recipients at all — it returns null
 * for viewers without `canGrantItems`, so a moderator who only moderates never
 * sees this and approves exactly as before.
 *
 * The amounts are held by the parent card rather than here, because Approve is
 * what submits them: the reward is attached to the approval rather than being
 * its own action, so that a member is never approved-but-unpaid.
 */

const RELATION_LABEL: Record<MediaAwardRelation, string> = {
  [MediaAwardRelation.Uploader]: "uploader",
  [MediaAwardRelation.Artist]: "artist",
  [MediaAwardRelation.MediaOwner]: "owner",
  [MediaAwardRelation.CharacterOwner]: "character owner",
};

const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  background: ${({ theme }) => theme.colors.background};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 0.5rem;
`;

const CurrencySelect = styled.select`
  width: 100%;
  padding: 0.375rem 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const Who = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Relations = styled.div`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const AmountInput = styled.input`
  width: 5.5rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};
`;

const Unpayable = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
  white-space: nowrap;
`;

const Total = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.4rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export interface AwardCurrency {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
}

export interface AwardRecipient {
  userId: string;
  relations: MediaAwardRelation[];
  isMember: boolean;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
  };
}

interface AwardRecipientsWidgetProps {
  recipients: AwardRecipient[];
  currencies: AwardCurrency[];
  currencyId: string;
  onCurrencyChange: (currencyId: string) => void;
  /** userId -> raw input value. Empty means no award. */
  amounts: Record<string, string>;
  onAmountChange: (userId: string, value: string) => void;
  disabled?: boolean;
}

export const AwardRecipientsWidget: React.FC<AwardRecipientsWidgetProps> = ({
  recipients,
  currencies,
  currencyId,
  onCurrencyChange,
  amounts,
  onAmountChange,
  disabled,
}) => {
  // A community with no currency has nothing to award, and a media naming
  // nobody payable has nobody to award it to. Either way, no widget.
  if (currencies.length === 0 || recipients.length === 0) return null;

  const currency = currencies.find((c) => c.id === currencyId) ?? currencies[0];

  const total = recipients.reduce((sum, recipient) => {
    const value = Number(amounts[recipient.userId] ?? "");
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  return (
    <Wrap data-testid="award-widget">
      <Head>
        <Coins size={12} /> Award currency
      </Head>

      {/* One currency for the whole approval. Paying the artist more than the
          uploader is a real case; paying them in different currencies is not. */}
      {currencies.length > 1 && (
        <CurrencySelect
          aria-label="Currency to award"
          value={currency.id}
          disabled={disabled}
          onChange={(e) => onCurrencyChange(e.target.value)}
          data-testid="award-currency"
        >
          {currencies.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </CurrencySelect>
      )}

      {recipients.map((recipient) => {
        const label =
          recipient.user.displayName || `@${recipient.user.username}`;
        return (
          <Row
            key={recipient.userId}
            data-testid={`award-row-${recipient.user.username}`}
          >
            <Who>
              <Name title={`@${recipient.user.username}`}>{label}</Name>
              <Relations>
                {recipient.relations
                  .map((relation) => RELATION_LABEL[relation])
                  .join(" · ")}
              </Relations>
            </Who>
            {recipient.isMember ? (
              <AmountInput
                type="number"
                min={1}
                step={1}
                placeholder="0"
                aria-label={`Award to ${recipient.user.username}`}
                value={amounts[recipient.userId] ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onAmountChange(recipient.userId, e.target.value)
                }
              />
            ) : (
              // Not an input they can fill and have silently ignored: currency
              // cannot reach a non-member, so the control is absent and says why.
              <Unpayable>not a member</Unpayable>
            )}
          </Row>
        );
      })}

      {total > 0 && (
        <Total data-testid="award-total">
          Approving grants <strong>{formatAmount(total, currency)}</strong> in
          total.
        </Total>
      )}
    </Wrap>
  );
};

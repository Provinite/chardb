import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import {
  useGetMemberWalletQuery,
  useGetCommunityMembersQuery,
  useTransferCurrencyMutation,
  type CurrencyFieldsFragment,
} from "../../generated/graphql";
import { formatAmount } from "../../lib/currencyDisplay";

/**
 * What one member holds of every currency in a community.
 *
 * Sits above their items rather than on a page of its own: coin and items are
 * one answer to "what does this person have", and splitting them across two
 * pages makes a trade partner check two places.
 *
 * Currencies with a zero balance are shown, not hidden. A wallet that lists
 * only what someone already has cannot tell them a currency exists, which is
 * the one thing they need to know before they can go and earn any.
 */

const Section = styled.section`
  margin-bottom: 2rem;
`;

const Heading = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
`;

const HeadingTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.75rem;
`;

const Card = styled.div<{ $empty: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 0.875rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  opacity: ${({ $empty }) => ($empty ? 0.6 : 1)};
`;

const Amount = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CurrencyName = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.15rem;
`;

const CardActions = styled.div`
  margin-top: 0.625rem;
`;

const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8125rem;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Modal = styled.div<{ isOpen: boolean }>`
  display: ${({ isOpen }) => (isOpen ? "flex" : "none")};
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: 2rem;
  border-radius: 12px;
  max-width: 480px;
  width: 90%;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.span`
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Empty = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin: 0;
`;

interface CurrencyWalletProps {
  communityId: string;
  /** Whose wallet this is. */
  userId: string;
  /** True when the viewer is looking at their own wallet, which adds Send. */
  isOwnWallet: boolean;
}

export const CurrencyWallet: React.FC<CurrencyWalletProps> = ({
  communityId,
  userId,
  isOwnWallet,
}) => {
  const [sending, setSending] = useState<CurrencyFieldsFragment | null>(null);
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data, loading, refetch } = useGetMemberWalletQuery({
    variables: { communityId, userId },
    skip: !communityId || !userId,
  });

  const { data: memberData } = useGetCommunityMembersQuery({
    variables: { communityId, limit: 200 },
    skip: !sending,
  });

  const [transferCurrency, { loading: transferring }] =
    useTransferCurrencyMutation();

  const balances = useMemo(() => data?.memberWallet?.balances ?? [], [data]);

  // Everyone but the sender. Transferring to yourself is refused server-side
  // anyway, but offering it as a choice is just a dead end in the form.
  const recipients = useMemo(
    () => (memberData?.community?.members ?? []).filter((m) => m.id !== userId),
    [memberData, userId],
  );

  const held = balances.find((line) => line.currency.id === sending?.id);

  const closeModal = () => {
    setSending(null);
    setToUserId("");
    setAmount("");
    setReason("");
  };

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sending || !toUserId) return;

    try {
      await transferCurrency({
        variables: {
          input: {
            currencyId: sending.id,
            toUserId,
            amount: Number(amount),
            reason: reason || undefined,
          },
        },
      });
      toast.success(`Sent ${formatAmount(Number(amount), sending)}`);
      await refetch();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that");
    }
  };

  if (loading || balances.length === 0) {
    // A community with no currencies gets no empty wallet taking up space
    // above their items.
    return null;
  }

  return (
    <Section data-testid="currency-wallet">
      <Heading>
        <HeadingTitle>Currency</HeadingTitle>
        <Link to={`/communities/${communityId}/currencies/ledger`}>
          Currency ledger
        </Link>
      </Heading>
      <Cards>
        {balances.map((line) => (
          <Card
            key={line.currency.id}
            $empty={line.amount === 0}
            data-testid={`wallet-${line.currency.code}`}
          >
            <Amount>{formatAmount(line.amount, line.currency)}</Amount>
            <CurrencyName>{line.currency.name}</CurrencyName>
            {isOwnWallet && line.amount > 0 && (
              <CardActions>
                <SendButton
                  type="button"
                  onClick={() => setSending(line.currency)}
                >
                  <Send size={13} /> Send
                </SendButton>
              </CardActions>
            )}
          </Card>
        ))}
      </Cards>
      {balances.every((line) => line.amount === 0) && (
        <Empty style={{ marginTop: "0.75rem" }}>
          Nothing held yet. These are the currencies this community uses.
        </Empty>
      )}

      <Modal isOpen={Boolean(sending)}>
        <ModalContent data-testid="transfer-dialog">
          <ModalTitle>Send {sending?.name}</ModalTitle>
          <Form onSubmit={handleTransfer}>
            <FormGroup>
              <Label htmlFor="transfer-to">To</Label>
              <Select
                id="transfer-to"
                value={toUserId}
                required
                onChange={(e) => setToUserId(e.target.value)}
              >
                <option value="">Choose a member…</option>
                {recipients.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.username} (@{member.username})
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="transfer-amount">
                Amount{" "}
                <Hint>
                  You hold{" "}
                  {held && sending ? formatAmount(held.amount, sending) : "—"}.
                </Hint>
              </Label>
              <Input
                id="transfer-amount"
                type="number"
                min={1}
                max={held?.amount}
                value={amount}
                required
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="transfer-reason">
                Note <Hint>Optional, and public in the ledger.</Hint>
              </Label>
              <Input
                id="transfer-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For the adopt"
              />
            </FormGroup>
            <ModalActions>
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transferring || !toUserId || !amount}
              >
                Send
              </Button>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>
    </Section>
  );
};

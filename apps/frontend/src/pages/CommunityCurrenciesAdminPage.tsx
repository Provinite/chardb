import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { useParams, Link } from "react-router-dom";
import {
  Coins,
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Send,
} from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import {
  useGetCurrencySupplyQuery,
  useCreateCurrencyMutation,
  useUpdateCurrencyMutation,
  useMintCurrencyMutation,
  useBurnCurrencyMutation,
  useGetCommunityMembersQuery,
  type CurrencyFieldsFragment,
} from "../generated/graphql";
import { formatAmount } from "../lib/currencyDisplay";

/**
 * A community's currencies, and what each of them is doing.
 *
 * The table is the point of the page. A currency is only as trustworthy as the
 * numbers behind it, so circulation, holders and 30-day flow sit on the row
 * rather than behind a click — an admin about to mint 5,000 more of something
 * should be able to see how much already exists without navigating.
 *
 * Minting and removing both happen from here, because both are staff acting on
 * the economy as a whole. Spending is not here at all: that is a member acting
 * on their own balance.
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  max-width: 60ch;
`;

const TableWrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
`;

const Th = styled.th<{ $numeric?: boolean }>`
  text-align: ${({ $numeric }) => ($numeric ? "right" : "left")};
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td<{ $numeric?: boolean }>`
  text-align: ${({ $numeric }) => ($numeric ? "right" : "left")};
  padding: 0.875rem 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: middle;
  ${({ $numeric }) =>
    $numeric &&
    css`
      font-variant-numeric: tabular-nums;
    `}
`;

const Row = styled.tr<{ $archived?: boolean }>`
  ${({ $archived }) =>
    $archived &&
    css`
      opacity: 0.55;
    `}

  &:last-child td {
    border-bottom: none;
  }
`;

const CurrencyName = styled.div`
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Code = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.4rem;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.muted};
  font-variant-numeric: tabular-nums;
`;

const ArchivedTag = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CurrencyDescription = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.2rem;
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.375rem;
  justify-content: flex-end;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Empty = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
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
  max-width: 560px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.375rem;
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

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 1rem;
  min-height: 72px;
  resize: vertical;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.surface};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
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
  margin-top: 0.5rem;
`;

const Recipients = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 0.625rem;
`;

const RecipientRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.3rem 0.25rem;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Preview = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

type ModalKind = "create" | "edit" | "mint" | "burn" | null;

const blankForm = {
  name: "",
  code: "",
  symbol: "",
  description: "",
};

export const CommunityCurrenciesAdminPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { permissions, community } = useUserCommunityRole(communityId);

  const [modal, setModal] = useState<ModalKind>(null);
  const [active, setActive] = useState<CurrencyFieldsFragment | null>(null);
  const [form, setForm] = useState(blankForm);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [burnTarget, setBurnTarget] = useState("");

  const { data, loading, error, refetch } = useGetCurrencySupplyQuery({
    variables: { communityId: communityId as string },
    skip: !communityId,
    // Circulation and holder counts move whenever anybody grants, spends or
    // transfers, so a cached copy is out of date almost immediately -- and
    // this is the page somebody reads before deciding to mint more.
    fetchPolicy: "cache-and-network",
  });

  // Only fetched for the mint and burn pickers. Staff need to name who is being
  // paid, and a free-text user id field is a way to pay the wrong person.
  const { data: memberData } = useGetCommunityMembersQuery({
    variables: { communityId: communityId as string, limit: 200 },
    skip: !communityId || (modal !== "mint" && modal !== "burn"),
  });

  const [createCurrency, { loading: creating }] = useCreateCurrencyMutation();
  const [updateCurrency, { loading: updating }] = useUpdateCurrencyMutation();
  const [mintCurrency, { loading: minting }] = useMintCurrencyMutation();
  const [burnCurrency, { loading: burning }] = useBurnCurrencyMutation();

  const supply = useMemo(() => data?.currencySupply ?? [], [data]);
  const members = useMemo(
    () => memberData?.community?.members ?? [],
    [memberData],
  );

  const busy = creating || updating || minting || burning;

  const closeModal = () => {
    setModal(null);
    setActive(null);
    setForm(blankForm);
    setAmount("");
    setReason("");
    setStaffNote("");
    setRecipients([]);
    setBurnTarget("");
  };

  const openCreate = () => {
    setForm(blankForm);
    setActive(null);
    setModal("create");
  };

  const openEdit = (currency: CurrencyFieldsFragment) => {
    setActive(currency);
    setForm({
      name: currency.name,
      code: currency.code,
      symbol: currency.symbol ?? "",
      description: currency.description ?? "",
    });
    setModal("edit");
  };

  const openMint = (currency: CurrencyFieldsFragment) => {
    setActive(currency);
    setAmount("");
    setReason("");
    setStaffNote("");
    setRecipients([]);
    setModal("mint");
  };

  const openBurn = (currency: CurrencyFieldsFragment) => {
    setActive(currency);
    setAmount("");
    setReason("");
    setStaffNote("");
    setBurnTarget("");
    setModal("burn");
  };

  const handleSaveCurrency = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!communityId) return;

    try {
      if (modal === "edit" && active) {
        await updateCurrency({
          variables: {
            id: active.id,
            input: {
              name: form.name,
              code: form.code,
              symbol: form.symbol || null,
              description: form.description || null,
            },
          },
        });
        toast.success(`${form.name} updated`);
      } else {
        await createCurrency({
          variables: {
            input: {
              communityId,
              name: form.name,
              code: form.code,
              symbol: form.symbol || undefined,
              description: form.description || undefined,
            },
          },
        });
        toast.success(`${form.name} created`);
      }
      await refetch();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleArchive = async (
    currency: CurrencyFieldsFragment,
    archived: boolean,
  ) => {
    try {
      await updateCurrency({
        variables: { id: currency.id, input: { archived } },
      });
      toast.success(
        archived ? `${currency.name} archived` : `${currency.name} restored`,
      );
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleMint = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!active || recipients.length === 0) return;

    try {
      await mintCurrency({
        variables: {
          input: {
            currencyId: active.id,
            userIds: recipients,
            amount: Number(amount),
            reason,
            staffNote: staffNote || undefined,
          },
        },
      });
      toast.success(
        `Granted ${formatAmount(Number(amount), active)} to ${
          recipients.length
        } ${recipients.length === 1 ? "member" : "members"}`,
      );
      await refetch();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleBurn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!active || !burnTarget) return;

    try {
      await burnCurrency({
        variables: {
          input: {
            currencyId: active.id,
            userId: burnTarget,
            amount: Number(amount),
            reason,
            staffNote: staffNote || undefined,
          },
        },
      });
      toast.success(`Removed ${formatAmount(Number(amount), active)}`);
      await refetch();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const toggleRecipient = (userId: string) => {
    setRecipients((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  if (!communityId) {
    return (
      <Container>
        <Empty>This page needs a community in the URL.</Empty>
      </Container>
    );
  }

  // Only before there is anything to show. cache-and-network reports loading
  // on every background revalidation, and replacing a populated table with a
  // spinner on each visit would be worse than the staleness it fixes.
  if (loading && !data) return <LoadingSpinner />;

  if (error) {
    return (
      <Container>
        <Empty>Could not load currencies: {error.message}</Empty>
      </Container>
    );
  }

  const canManage = permissions.canManageItems;
  const canGrant = permissions.canGrantItems;

  return (
    <Container data-testid="currencies-admin-page">
      <Header>
        <div>
          <Title>
            <Coins size={28} /> Currencies
          </Title>
          <Subtitle>
            {community?.name ? `${community.name}. ` : ""}
            Currency is created by granting it and leaves circulation when it is
            spent or removed. There is no treasury: every unit that exists is in
            somebody&apos;s hands.
          </Subtitle>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus size={16} /> New currency
          </Button>
        )}
      </Header>

      {supply.length === 0 ? (
        <Empty data-testid="currencies-empty">
          <p>
            <strong>No currencies yet.</strong>
          </p>
          <p>
            A currency is for something fungible that members earn and spend —
            event coin, shop credit. Anything with its own history should stay
            an item.
          </p>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Create the first one
            </Button>
          )}
        </Empty>
      ) : (
        <TableWrap>
          <Table data-testid="currency-supply-table">
            <thead>
              <tr>
                <Th>Currency</Th>
                <Th $numeric>In circulation</Th>
                <Th $numeric>Holders</Th>
                <Th $numeric>Granted 30d</Th>
                <Th $numeric>Removed 30d</Th>
                <Th $numeric>Largest</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {supply.map((row) => {
                const archived = Boolean(row.currency.archivedAt);
                return (
                  <Row
                    key={row.currency.id}
                    $archived={archived}
                    data-testid={`currency-row-${row.currency.code}`}
                  >
                    <Td>
                      <CurrencyName>
                        {row.currency.symbol && (
                          <span aria-hidden>{row.currency.symbol}</span>
                        )}
                        <Link
                          to={`/communities/${communityId}/currencies/ledger?currencyId=${row.currency.id}`}
                        >
                          {row.currency.name}
                        </Link>
                        <Code>{row.currency.code}</Code>
                        {archived && <ArchivedTag>Archived</ArchivedTag>}
                      </CurrencyName>
                      {row.currency.description && (
                        <CurrencyDescription>
                          {row.currency.description}
                        </CurrencyDescription>
                      )}
                    </Td>
                    <Td $numeric>
                      {row.inCirculation.toLocaleString("en-US")}
                    </Td>
                    <Td $numeric>{row.holders.toLocaleString("en-US")}</Td>
                    <Td $numeric>
                      {row.mintedLast30Days > 0 ? (
                        `+${row.mintedLast30Days.toLocaleString("en-US")}`
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </Td>
                    <Td $numeric>
                      {row.removedLast30Days > 0 ? (
                        `−${row.removedLast30Days.toLocaleString("en-US")}`
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </Td>
                    <Td $numeric>
                      {row.largestBalance.toLocaleString("en-US")}
                    </Td>
                    <Td>
                      <Actions>
                        {canGrant && !archived && (
                          <IconButton
                            onClick={() => openMint(row.currency)}
                            data-testid={`grant-${row.currency.code}`}
                          >
                            <Send size={14} /> Grant
                          </IconButton>
                        )}
                        {canGrant && !archived && (
                          <IconButton onClick={() => openBurn(row.currency)}>
                            Remove
                          </IconButton>
                        )}
                        {canManage && (
                          <IconButton onClick={() => openEdit(row.currency)}>
                            <Edit2 size={14} />
                          </IconButton>
                        )}
                        {canManage && (
                          <IconButton
                            onClick={() =>
                              handleArchive(row.currency, !archived)
                            }
                            title={
                              archived
                                ? "Restore this currency"
                                : "Archive: stops new transactions, keeps every balance and statement readable"
                            }
                          >
                            {archived ? (
                              <ArchiveRestore size={14} />
                            ) : (
                              <Archive size={14} />
                            )}
                          </IconButton>
                        )}
                      </Actions>
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* ==================== Create / edit ==================== */}
      <Modal isOpen={modal === "create" || modal === "edit"}>
        <ModalContent>
          <ModalTitle>
            {modal === "edit" ? `Edit ${active?.name}` : "New currency"}
          </ModalTitle>
          <Form onSubmit={handleSaveCurrency}>
            <FormGroup>
              <Label htmlFor="currency-name">Name</Label>
              <Input
                id="currency-name"
                value={form.name}
                maxLength={50}
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Hollow Coin"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="currency-code">
                Code <Hint>Shown wherever there is no room for the name.</Hint>
              </Label>
              <Input
                id="currency-code"
                value={form.code}
                maxLength={10}
                pattern="[A-Za-z0-9]{1,10}"
                required
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="HC"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="currency-symbol">
                Symbol <Hint>Optional. Rendered before the amount.</Hint>
              </Label>
              <Input
                id="currency-symbol"
                value={form.symbol}
                maxLength={8}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                placeholder="⬡"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="currency-description">Description</Label>
              <TextArea
                id="currency-description"
                value={form.description}
                maxLength={500}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Earned from prompts and spent in the shop."
              />
            </FormGroup>
            {form.name && form.code && (
              <Preview>
                Amounts will read{" "}
                <strong>
                  {formatAmount(1250, {
                    code: form.code.toUpperCase(),
                    symbol: form.symbol || null,
                  })}
                </strong>
              </Preview>
            )}
            <ModalActions>
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {modal === "edit" ? "Save" : "Create"}
              </Button>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>

      {/* ==================== Grant ==================== */}
      <Modal isOpen={modal === "mint"}>
        <ModalContent data-testid="grant-dialog">
          <ModalTitle>Grant {active?.name}</ModalTitle>
          <Form onSubmit={handleMint}>
            <FormGroup>
              <Label htmlFor="mint-amount">
                Amount each <Hint>Every member selected receives this.</Hint>
              </Label>
              <Input
                id="mint-amount"
                type="number"
                min={1}
                value={amount}
                required
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="mint-recipients">
                Recipients{" "}
                <Hint>
                  {recipients.length} selected. One grant, one ledger event.
                </Hint>
              </Label>
              <Recipients id="mint-recipients" data-testid="mint-recipients">
                {members.map((member) => (
                  <RecipientRow key={member.id}>
                    <input
                      type="checkbox"
                      checked={recipients.includes(member.id)}
                      onChange={() => toggleRecipient(member.id)}
                    />
                    <span>
                      {member.displayName || member.username}{" "}
                      <Muted>@{member.username}</Muted>
                    </span>
                  </RecipientRow>
                ))}
              </Recipients>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="mint-reason">
                Reason <Hint>Public. Every member can read this.</Hint>
              </Label>
              <Input
                id="mint-reason"
                value={reason}
                maxLength={500}
                required
                onChange={(e) => setReason(e.target.value)}
                placeholder="Placed in the summer prompt"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="mint-note">
                Staff note <Hint>Optional. Only staff can read this.</Hint>
              </Label>
              <TextArea
                id="mint-note"
                value={staffNote}
                maxLength={2000}
                onChange={(e) => setStaffNote(e.target.value)}
              />
            </FormGroup>
            {active && amount && recipients.length > 0 && (
              <Preview>
                Creating{" "}
                <strong>
                  {formatAmount(Number(amount) * recipients.length, active)}
                </strong>{" "}
                in total, {formatAmount(Number(amount), active)} each to{" "}
                {recipients.length}{" "}
                {recipients.length === 1 ? "member" : "members"}.
              </Preview>
            )}
            <ModalActions>
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || recipients.length === 0 || !amount}
              >
                Grant
              </Button>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>

      {/* ==================== Remove ==================== */}
      <Modal isOpen={modal === "burn"}>
        <ModalContent>
          <ModalTitle>Remove {active?.name}</ModalTitle>
          <Form onSubmit={handleBurn}>
            <FormGroup>
              <Label htmlFor="burn-member">Member</Label>
              <Select
                id="burn-member"
                value={burnTarget}
                required
                onChange={(e) => setBurnTarget(e.target.value)}
              >
                <option value="">Choose a member…</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.username} (@{member.username})
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="burn-amount">
                Amount{" "}
                <Hint>
                  Refused if it is more than they hold — balances never go
                  negative.
                </Hint>
              </Label>
              <Input
                id="burn-amount"
                type="number"
                min={1}
                value={amount}
                required
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="burn-reason">
                Reason <Hint>Public. The member will see this.</Hint>
              </Label>
              <Input
                id="burn-reason"
                value={reason}
                maxLength={500}
                required
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reversed a duplicate payout"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="burn-note">
                Staff note <Hint>Optional. Only staff can read this.</Hint>
              </Label>
              <TextArea
                id="burn-note"
                value={staffNote}
                maxLength={2000}
                onChange={(e) => setStaffNote(e.target.value)}
              />
            </FormGroup>
            <ModalActions>
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={busy || !burnTarget || !amount}
              >
                Remove
              </Button>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>
    </Container>
  );
};

import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { useParams, Link } from "react-router-dom";
import { Store, Plus, Edit2, EyeOff, Eye, X } from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import {
  useGetShopItemsQuery,
  useCreateShopItemMutation,
  useUpdateShopItemMutation,
  useGetCurrenciesQuery,
  useGetItemTypesQuery,
  type ShopItemFieldsFragment,
} from "../generated/graphql";
import { formatPrice } from "../lib/currencyDisplay";

/**
 * What a community sells, and for how much.
 *
 * The price editor is the part that earns its complexity: an item can be
 * bought several ways, and each way can ask for several currencies at once.
 * Everything else here is an ordinary form.
 */

const Container = styled.div`
  max-width: 1150px;
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
  max-width: 62ch;
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
  min-width: 760px;
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
  vertical-align: top;
  ${({ $numeric }) =>
    $numeric &&
    css`
      font-variant-numeric: tabular-nums;
    `}
`;

const Row = styled.tr<{ $inactive?: boolean }>`
  ${({ $inactive }) =>
    $inactive &&
    css`
      opacity: 0.5;
    `}
  &:last-child td {
    border-bottom: none;
  }
`;

const PriceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8125rem;
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
`;

const Empty = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
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
  max-width: 620px;
  width: 92%;
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

const TwoUp = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 1rem;
  min-height: 64px;
  resize: vertical;
  font-family: inherit;
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

const PriceOption = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const PriceHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 0.5rem;
`;

const ComponentRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 6rem auto;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
`;

const SmallSelect = styled.select`
  padding: 0.35rem 0.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
`;

const SmallInput = styled.input`
  padding: 0.35rem 0.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
`;

const TinyButton = styled.button`
  padding: 0.25rem 0.45rem;
  font-size: 0.75rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

interface DraftComponent {
  currencyId: string;
  amount: string;
}
interface DraftPrice {
  components: DraftComponent[];
}

const blankDraft = (currencyId: string): DraftPrice => ({
  components: [{ currencyId, amount: "" }],
});

export const CommunityShopAdminPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { permissions } = useUserCommunityRole(communityId);

  const [editing, setEditing] = useState<ShopItemFieldsFragment | null>(null);
  const [creating, setCreating] = useState(false);
  const [itemTypeId, setItemTypeId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [maxPerUser, setMaxPerUser] = useState("");
  const [prices, setPrices] = useState<DraftPrice[]>([]);

  const { data, loading, error, refetch } = useGetShopItemsQuery({
    variables: { communityId: communityId as string, includeInactive: true },
    skip: !communityId,
    fetchPolicy: "cache-and-network",
  });
  const { data: currencyData } = useGetCurrenciesQuery({
    variables: { communityId: communityId as string },
    skip: !communityId,
  });
  const { data: itemTypeData } = useGetItemTypesQuery({
    // 100 is the server's cap. Asking for more is a validation error, and
    // because it fails on its own query the page still renders -- the New
    // listing button simply never appears, with nothing to say why.
    variables: { filters: { communityId: communityId as string, limit: 100 } },
    skip: !communityId,
  });

  const items = useMemo(() => data?.shopItems ?? [], [data]);
  const currencies = useMemo(
    () => currencyData?.currencies ?? [],
    [currencyData],
  );
  const itemTypes = useMemo(
    () => itemTypeData?.itemTypes?.itemTypes ?? [],
    [itemTypeData],
  );

  const [createShopItem, { loading: saving }] = useCreateShopItemMutation();
  const [updateShopItem, { loading: updating }] = useUpdateShopItemMutation();

  const open = (item: ShopItemFieldsFragment | null) => {
    setEditing(item);
    setCreating(item === null);
    setItemTypeId(item?.itemTypeId ?? itemTypes[0]?.id ?? "");
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setStock(
      item?.stock === null || item?.stock === undefined
        ? ""
        : String(item.stock),
    );
    setMaxPerUser(
      item?.maxPerUser === null || item?.maxPerUser === undefined
        ? ""
        : String(item.maxPerUser),
    );
    setPrices(
      item
        ? item.prices.map((p) => ({
            components: p.components.map((c) => ({
              currencyId: c.currency.id,
              amount: String(c.amount),
            })),
          }))
        : [blankDraft(currencies[0]?.id ?? "")],
    );
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const toInput = () => ({
    name: name.trim() || undefined,
    description: description.trim() || undefined,
    // Blank means "no limit", which is a different thing from zero.
    stock: stock.trim() === "" ? undefined : Math.trunc(Number(stock)),
    maxPerUser:
      maxPerUser.trim() === "" ? undefined : Math.trunc(Number(maxPerUser)),
    prices: prices.map((price) => ({
      components: price.components
        .filter((c) => c.currencyId && Number(c.amount) > 0)
        .map((c) => ({
          currencyId: c.currencyId,
          amount: Math.trunc(Number(c.amount)),
        })),
    })),
  });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!communityId) return;

    const input = toInput();
    if (input.prices.some((p) => p.components.length === 0)) {
      toast.error("Every price option needs at least one currency");
      return;
    }

    try {
      if (editing) {
        await updateShopItem({ variables: { id: editing.id, input } });
        toast.success("Listing updated");
      } else {
        await createShopItem({
          variables: { input: { ...input, communityId, itemTypeId } },
        });
        toast.success("Listing created");
      }
      await refetch();
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const toggleActive = async (item: ShopItemFieldsFragment) => {
    try {
      await updateShopItem({
        variables: { id: item.id, input: { active: !item.active } },
      });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!communityId) {
    return (
      <Container>
        <Empty>This page needs a community in the URL.</Empty>
      </Container>
    );
  }
  if (loading && items.length === 0) return <LoadingSpinner />;
  if (error) {
    return (
      <Container>
        <Empty>Could not load the shop: {error.message}</Empty>
      </Container>
    );
  }

  const canManage = permissions.canManageItems;
  const modalOpen = creating || editing !== null;

  return (
    <Container data-testid="shop-admin-page">
      <Header>
        <div>
          <Title>
            <Store size={28} /> Shop
          </Title>
          <Subtitle>
            What members can buy, and what it costs them. A listing grants a
            real item, so anything sold here shows up in an inventory with its
            own history.{" "}
            <Link to={`/communities/${communityId}/shop`}>
              See the member view
            </Link>
            .
          </Subtitle>
        </div>
        {canManage && currencies.length > 0 && itemTypes.length > 0 && (
          <Button onClick={() => open(null)}>
            <Plus size={16} /> New listing
          </Button>
        )}
      </Header>

      {currencies.length === 0 && (
        <Empty>
          This community has no currency yet, so nothing can be priced.{" "}
          <Link to={`/communities/${communityId}/currencies`}>
            Create one first
          </Link>
          .
        </Empty>
      )}

      {currencies.length > 0 && itemTypes.length === 0 && (
        <Empty>
          This community has no item types yet, and a listing has to grant
          something.{" "}
          <Link to={`/communities/${communityId}/admin/items`}>
            Create one first
          </Link>
          .
        </Empty>
      )}

      {currencies.length > 0 && items.length === 0 ? (
        <Empty data-testid="shop-admin-empty">
          <p>
            <strong>Nothing listed yet.</strong>
          </p>
          <p>
            A listing points at an item type and gives it one or more prices.
            Members spend currency; the coin leaves circulation.
          </p>
        </Empty>
      ) : (
        currencies.length > 0 && (
          <TableWrap>
            <Table data-testid="shop-admin-table">
              <thead>
                <tr>
                  <Th>Listing</Th>
                  <Th>Prices</Th>
                  <Th $numeric>Stock</Th>
                  <Th $numeric>Per member</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Row
                    key={item.id}
                    $inactive={!item.active}
                    data-testid={`shop-admin-row-${item.id}`}
                  >
                    <Td>
                      <strong>{item.name || item.itemType.name}</strong>
                      <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        Grants {item.itemType.name}
                        {!item.active && " · hidden"}
                      </div>
                    </Td>
                    <Td>
                      <PriceList>
                        {item.prices.map((price) => (
                          <span key={price.id}>
                            {formatPrice(price.components)}
                          </span>
                        ))}
                      </PriceList>
                    </Td>
                    <Td $numeric>
                      {item.stock === null || item.stock === undefined
                        ? "∞"
                        : item.stock}
                    </Td>
                    <Td $numeric>{item.maxPerUser ?? "∞"}</Td>
                    <Td>
                      {canManage && (
                        <Actions>
                          <IconButton onClick={() => open(item)}>
                            <Edit2 size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => toggleActive(item)}
                            title={
                              item.active
                                ? "Hide from members. Past purchases keep their meaning."
                                : "Show to members again"
                            }
                          >
                            {item.active ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </IconButton>
                        </Actions>
                      )}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )
      )}

      <Modal $isOpen={modalOpen}>
        <ModalContent data-testid="shop-item-dialog">
          <ModalTitle>
            {editing
              ? `Edit ${editing.name || editing.itemType.name}`
              : "New listing"}
          </ModalTitle>
          <Form onSubmit={handleSave}>
            {!editing && (
              <FormGroup>
                <Label htmlFor="shop-item-type">
                  Item type <Hint>What buying this grants.</Hint>
                </Label>
                <Select
                  id="shop-item-type"
                  value={itemTypeId}
                  required
                  onChange={(e) => setItemTypeId(e.target.value)}
                >
                  {itemTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            )}

            <FormGroup>
              <Label htmlFor="shop-name">
                Name <Hint>Optional. Falls back to the item type's name.</Hint>
              </Label>
              <Input
                id="shop-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="shop-description">Description</Label>
              <TextArea
                id="shop-description"
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormGroup>

            <TwoUp>
              <FormGroup>
                <Label htmlFor="shop-stock">
                  Stock <Hint>Blank for unlimited.</Hint>
                </Label>
                <Input
                  id="shop-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="shop-max">
                  Limit per member <Hint>Blank for none.</Hint>
                </Label>
                <Input
                  id="shop-max"
                  type="number"
                  min={1}
                  step={1}
                  value={maxPerUser}
                  onChange={(e) => setMaxPerUser(e.target.value)}
                />
              </FormGroup>
            </TwoUp>

            <FormGroup>
              <Label>
                Prices{" "}
                <Hint>
                  Each option is one way to pay. A buyer picks one and pays all
                  of it.
                </Hint>
              </Label>
              {prices.map((price, priceIndex) => (
                <PriceOption key={priceIndex}>
                  <PriceHead>
                    <span>Option {priceIndex + 1}</span>
                    {prices.length > 1 && (
                      <TinyButton
                        type="button"
                        onClick={() =>
                          setPrices(prices.filter((_, i) => i !== priceIndex))
                        }
                      >
                        <X size={11} /> Remove
                      </TinyButton>
                    )}
                  </PriceHead>
                  {price.components.map((component, componentIndex) => (
                    <ComponentRow key={componentIndex}>
                      <SmallSelect
                        aria-label="Currency"
                        value={component.currencyId}
                        onChange={(e) =>
                          setPrices(
                            prices.map((p, i) =>
                              i !== priceIndex
                                ? p
                                : {
                                    components: p.components.map((c, ci) =>
                                      ci === componentIndex
                                        ? { ...c, currencyId: e.target.value }
                                        : c,
                                    ),
                                  },
                            ),
                          )
                        }
                      >
                        {currencies.map((currency) => (
                          <option key={currency.id} value={currency.id}>
                            {currency.name}
                          </option>
                        ))}
                      </SmallSelect>
                      <SmallInput
                        type="number"
                        min={1}
                        step={1}
                        placeholder="0"
                        aria-label="Amount"
                        value={component.amount}
                        onChange={(e) =>
                          setPrices(
                            prices.map((p, i) =>
                              i !== priceIndex
                                ? p
                                : {
                                    components: p.components.map((c, ci) =>
                                      ci === componentIndex
                                        ? { ...c, amount: e.target.value }
                                        : c,
                                    ),
                                  },
                            ),
                          )
                        }
                      />
                      {price.components.length > 1 && (
                        <TinyButton
                          type="button"
                          onClick={() =>
                            setPrices(
                              prices.map((p, i) =>
                                i !== priceIndex
                                  ? p
                                  : {
                                      components: p.components.filter(
                                        (_, ci) => ci !== componentIndex,
                                      ),
                                    },
                              ),
                            )
                          }
                        >
                          <X size={11} />
                        </TinyButton>
                      )}
                    </ComponentRow>
                  ))}
                  <TinyButton
                    type="button"
                    onClick={() =>
                      setPrices(
                        prices.map((p, i) =>
                          i !== priceIndex
                            ? p
                            : {
                                components: [
                                  ...p.components,
                                  {
                                    currencyId: currencies[0]?.id ?? "",
                                    amount: "",
                                  },
                                ],
                              },
                        ),
                      )
                    }
                  >
                    <Plus size={11} /> and another currency
                  </TinyButton>
                </PriceOption>
              ))}
              <TinyButton
                type="button"
                data-testid="add-price-option"
                onClick={() =>
                  setPrices([...prices, blankDraft(currencies[0]?.id ?? "")])
                }
              >
                <Plus size={11} /> Another way to pay
              </TinyButton>
            </FormGroup>

            <ModalActions>
              <Button variant="secondary" type="button" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || updating}>
                {editing ? "Save" : "Create"}
              </Button>
            </ModalActions>
          </Form>
        </ModalContent>
      </Modal>
    </Container>
  );
};

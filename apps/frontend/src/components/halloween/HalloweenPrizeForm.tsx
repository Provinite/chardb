import React, { useState } from "react";
import styled from "styled-components";
import { Button, Input } from "@chardb/ui";
import { toast } from "react-hot-toast";
import {
  HalloweenPrizeDelivery,
  useCreateHalloweenPrizeMutation,
  useHalloweenPrizeOptionsQuery,
  useUpdateHalloweenPrizeMutation,
  type CreateHalloweenPrizeInput,
  type HalloweenPrizeFieldsFragment,
  type UpdateHalloweenPrizeInput,
} from "../../generated/graphql";

/**
 * Adding a Halloween prize, or changing one: what `/prize admin add` did in
 * Discord, and the `edit` it never had. A chardb prize is picked from the
 * community's own item types and unclaimed characters rather than typed as
 * an id, and shows their image; anything else takes an image URL.
 */

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Fieldset = styled.fieldset`
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  legend {
    font-size: 0.875rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 0.35rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
`;

const SearchRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
  max-height: 260px;
  overflow-y: auto;
`;

const Option = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem;
  border-radius: 8px;
  border: 2px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: 0.8125rem;

  img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 6px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
`;

interface HalloweenPrizeFormProps {
  communityId: string;
  /** The prize being changed, or null to add one. */
  prize: HalloweenPrizeFieldsFragment | null;
  onSaved: (prize: HalloweenPrizeFieldsFragment) => void;
  onCancel: () => void;
}

export const HalloweenPrizeForm: React.FC<HalloweenPrizeFormProps> = ({
  communityId,
  prize,
  onSaved,
  onCancel,
}) => {
  const editing = prize !== null;
  const [id, setId] = useState(prize?.id ?? "");
  const [name, setName] = useState(prize?.name ?? "");
  const [stock, setStock] = useState(String(prize?.currentStock ?? 1));
  const [weight, setWeight] = useState(String(prize?.weight ?? 10));
  const [delivery, setDelivery] = useState<HalloweenPrizeDelivery>(
    prize?.delivery ?? HalloweenPrizeDelivery.Staff,
  );
  const [image, setImage] = useState(
    prize?.delivery === HalloweenPrizeDelivery.Staff ? (prize.image ?? "") : "",
  );
  const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStaffPrize = delivery === HalloweenPrizeDelivery.Staff;
  const { data: optionsData, loading: optionsLoading } =
    useHalloweenPrizeOptionsQuery({
      variables: { communityId, search },
      skip: editing || isStaffPrize,
    });
  const options =
    delivery === HalloweenPrizeDelivery.ChardbItem
      ? optionsData?.halloweenPrizeOptions.itemTypes
      : optionsData?.halloweenPrizeOptions.characters;

  const [create, { loading: creating }] = useCreateHalloweenPrizeMutation();
  const [update, { loading: updating }] = useUpdateHalloweenPrizeMutation();
  const busy = creating || updating;

  const chooseDelivery = (next: HalloweenPrizeDelivery) => {
    setDelivery(next);
    setPick(null);
    setSearchText("");
    setSearch(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (editing) {
        const input: UpdateHalloweenPrizeInput = {
          name,
          currentStock: Number(stock),
          weight: Number(weight),
          ...(isStaffPrize ? { image } : {}),
        };
        const result = await update({
          variables: { communityId, prizeId: prize.id, input },
        });
        if (result.data) onSaved(result.data.updateHalloweenPrize);
      } else {
        const input: CreateHalloweenPrizeInput = {
          id,
          name,
          stock: Number(stock),
          weight: Number(weight),
          ...(isStaffPrize ? { image } : {}),
          ...(delivery === HalloweenPrizeDelivery.ChardbItem && pick
            ? { itemTypeId: pick.id }
            : {}),
          ...(delivery === HalloweenPrizeDelivery.ChardbCharacter && pick
            ? { characterId: pick.id }
            : {}),
        };
        const result = await create({ variables: { communityId, input } });
        if (result.data) onSaved(result.data.createHalloweenPrize);
      }
      toast.success(editing ? "Prize saved" : "Prize added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the prize");
    }
  };

  const kindLabel =
    delivery === HalloweenPrizeDelivery.ChardbItem
      ? "item types"
      : "characters";

  return (
    <Form onSubmit={(e) => void handleSubmit(e)}>
      <Row>
        <Field>
          <Label htmlFor="prize-id">Short name</Label>
          <Input
            id="prize-id"
            value={id}
            disabled={editing}
            required
            onChange={(e) => setId(e.target.value.toLowerCase())}
            placeholder="myo-common"
          />
          <Hint>
            {editing
              ? "Fixed once added."
              : "2–25 lowercase letters and hyphens, starting with a letter."}
          </Hint>
        </Field>
        <Field>
          <Label htmlFor="prize-name">Name</Label>
          <Input
            id="prize-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </Row>
      <Row>
        <Field>
          <Label htmlFor="prize-stock">
            {editing ? "Stock left" : "Stock"}
          </Label>
          <Input
            id="prize-stock"
            type="number"
            min={editing ? 0 : 1}
            max={999}
            step={1}
            required
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="prize-weight">Weight</Label>
          <Input
            id="prize-weight"
            type="number"
            min={0}
            max={1000}
            step={1}
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Hint>Chance of being drawn, relative to the others.</Hint>
        </Field>
      </Row>

      {!editing && (
        <Fieldset>
          <legend>Delivered by</legend>
          <label>
            <input
              type="radio"
              name="prize-delivery"
              checked={delivery === HalloweenPrizeDelivery.Staff}
              onChange={() => chooseDelivery(HalloweenPrizeDelivery.Staff)}
            />
            Staff hand it over
          </label>
          <label>
            <input
              type="radio"
              name="prize-delivery"
              checked={delivery === HalloweenPrizeDelivery.ChardbItem}
              onChange={() => chooseDelivery(HalloweenPrizeDelivery.ChardbItem)}
            />
            A chardb item
          </label>
          <label>
            <input
              type="radio"
              name="prize-delivery"
              checked={delivery === HalloweenPrizeDelivery.ChardbCharacter}
              onChange={() =>
                chooseDelivery(HalloweenPrizeDelivery.ChardbCharacter)
              }
            />
            A chardb character
          </label>
        </Fieldset>
      )}

      {isStaffPrize ? (
        <Field>
          <Label htmlFor="prize-image">Image URL</Label>
          <Input
            id="prize-image"
            type="url"
            required
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://…/prize.png"
          />
          <Hint>A png or jpg, shown in Discord when it is won.</Hint>
        </Field>
      ) : (
        !editing && (
          <Field>
            <SearchRow>
              <Field style={{ flex: 1 }}>
                <Label htmlFor="prize-search">Search {kindLabel}</Label>
                <Input
                  id="prize-search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setSearch(searchText.trim() || null);
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSearch(searchText.trim() || null)}
              >
                Search
              </Button>
            </SearchRow>
            <Hint>
              {delivery === HalloweenPrizeDelivery.ChardbCharacter
                ? "Only characters nobody owns or has been promised."
                : "The prize shows the item type's own image."}
            </Hint>
            {optionsLoading && !options ? (
              <Hint>Loading…</Hint>
            ) : options && options.length ? (
              <Options>
                {options.map((option) => (
                  <Option
                    key={option.id}
                    type="button"
                    $selected={pick?.id === option.id}
                    aria-pressed={pick?.id === option.id}
                    onClick={() =>
                      setPick({ id: option.id, name: option.name })
                    }
                  >
                    {option.image && <img src={option.image} alt="" />}
                    {option.name}
                  </Option>
                ))}
              </Options>
            ) : (
              <Hint>Nothing found.</Hint>
            )}
            {pick && <Hint>Selected: {pick.name}</Hint>}
          </Field>
        )
      )}

      <Actions>
        {error && <ErrorText role="alert">{error}</ErrorText>}
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={busy || (!editing && !isStaffPrize && !pick)}
        >
          {editing ? "Save prize" : "Add prize"}
        </Button>
      </Actions>
    </Form>
  );
};

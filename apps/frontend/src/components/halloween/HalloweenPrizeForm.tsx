import React, { useState } from "react";
import styled from "styled-components";
import {
  Button,
  CharacterTypeahead,
  Input,
  ItemTypeTypeahead,
  Radio,
  RadioGroup,
  type SearchSelectOption,
} from "@chardb/ui";
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
import { prizeIdFrom } from "./prizeId";

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
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
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

  legend {
    padding: 0;
    font-size: 0.875rem;
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 0.35rem;
  }
`;

/** The shared radios, side by side: three short choices fit on one line. */
const PrizeTypes = styled(RadioGroup)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
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
  // Picking an item or character fills in the names, but never over
  // something typed by hand.
  const [idTyped, setIdTyped] = useState(false);
  const [nameTyped, setNameTyped] = useState(false);
  const [stock, setStock] = useState(String(prize?.currentStock ?? 1));
  const [weight, setWeight] = useState(String(prize?.weight ?? 10));
  const [delivery, setDelivery] = useState<HalloweenPrizeDelivery>(
    prize?.delivery ?? HalloweenPrizeDelivery.ChardbItem,
  );
  const [image, setImage] = useState(
    prize?.delivery === HalloweenPrizeDelivery.Staff ? (prize.image ?? "") : "",
  );
  const [pick, setPick] = useState<SearchSelectOption | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStaffPrize = delivery === HalloweenPrizeDelivery.Staff;
  const isItemPrize = delivery === HalloweenPrizeDelivery.ChardbItem;
  // Nothing is listed until someone types, so nothing is asked for either.
  const { data: optionsData, loading: optionsLoading } =
    useHalloweenPrizeOptionsQuery({
      variables: { communityId, search },
      skip: editing || isStaffPrize || !search,
    });
  const options =
    (isItemPrize
      ? optionsData?.halloweenPrizeOptions.itemTypes
      : optionsData?.halloweenPrizeOptions.characters) ?? [];

  const [create, { loading: creating }] = useCreateHalloweenPrizeMutation();
  const [update, { loading: updating }] = useUpdateHalloweenPrizeMutation();
  const busy = creating || updating;

  const chooseDelivery = (next: HalloweenPrizeDelivery) => {
    setDelivery(next);
    setPick(null);
    setSearch(null);
    // Names filled in from the old pick no longer describe the prize.
    if (!nameTyped) setName("");
    if (!idTyped) setId("");
  };

  const choosePick = (option: SearchSelectOption | null) => {
    setPick(option);
    if (!option) return;
    if (!nameTyped) setName(option.name);
    if (!idTyped) setId(prizeIdFrom(option.name));
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
          ...(isItemPrize && pick ? { itemTypeId: pick.id } : {}),
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

  return (
    <Form onSubmit={(e) => void handleSubmit(e)}>
      {!editing && (
        <Fieldset>
          <legend>Prize type</legend>
          <PrizeTypes
            name="prize-type"
            value={delivery}
            onChange={(next) => chooseDelivery(next as HalloweenPrizeDelivery)}
          >
            <Radio value={HalloweenPrizeDelivery.ChardbItem}>Item</Radio>
            <Radio value={HalloweenPrizeDelivery.ChardbCharacter}>
              Character
            </Radio>
            <Radio value={HalloweenPrizeDelivery.Staff}>Other / off-site</Radio>
          </PrizeTypes>
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
          <Hint>
            A png or jpg, shown in Discord when it is won. Staff hand this prize
            over and mark it delivered.
          </Hint>
        </Field>
      ) : (
        !editing && (
          <Field>
            {isItemPrize ? (
              <ItemTypeTypeahead
                key={delivery}
                value={pick}
                onChange={choosePick}
                onSearch={setSearch}
                options={options}
                loading={optionsLoading}
              />
            ) : (
              <CharacterTypeahead
                key={delivery}
                value={pick}
                onChange={choosePick}
                onSearch={setSearch}
                options={options}
                loading={optionsLoading}
              />
            )}
            <Hint>
              {isItemPrize
                ? "The prize shows the item type's own image."
                : "Characters already owned, pending ownership, or already a prize do not show up in this list."}
            </Hint>
          </Field>
        )
      )}

      <Row>
        <Field>
          <Label htmlFor="prize-name">Name</Label>
          <Input
            id="prize-name"
            value={name}
            required
            onChange={(e) => {
              setNameTyped(true);
              setName(e.target.value);
            }}
          />
        </Field>
        <Field>
          <Label htmlFor="prize-id">Short name</Label>
          <Input
            id="prize-id"
            value={id}
            disabled={editing}
            required
            onChange={(e) => {
              setIdTyped(true);
              setId(e.target.value.toLowerCase());
            }}
            placeholder="myo-common"
          />
          <Hint>
            {editing
              ? "Fixed once added."
              : "2–25 lowercase letters and hyphens, starting with a letter."}
          </Hint>
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

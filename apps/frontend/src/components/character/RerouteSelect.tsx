import React from "react";
import { Select } from "@chardb/ui";
import type { SpeciesWithTraitsAndEnumValuesQuery } from "../../generated/graphql";
import { ColoredName } from "../colors";

type EnumChoice =
  SpeciesWithTraitsAndEnumValuesQuery["speciesById"]["traits"][number]["enumValues"][number];

/** The choice that drops the value instead of replacing it. */
const REMOVE_VALUE = "remove";

export interface RerouteSelectProps {
  /** What the stranded value can become: the options the new variant allows. */
  choices: readonly EnumChoice[];
  traitName: string;
  /** The stranded value's own name, for the box's accessible name. */
  optionName: string;
  /** The replacement's id, or an empty string to remove the value. */
  onPick: (to: string) => void;
  disabled?: boolean;
  "data-testid"?: string;
}

/**
 * Picks what one stranded trait value becomes when a character changes
 * variant: one of the options the new variant allows, or nothing.
 */
export const RerouteSelect: React.FC<RerouteSelectProps> = ({
  choices,
  traitName,
  optionName,
  onPick,
  disabled,
  "data-testid": testId,
}) => (
  <Select.Root
    data-testid={testId}
    aria-label={`Replacement for ${traitName} ${optionName}`}
    // Never anything but the prompt: a pick resolves the row, which takes the
    // box away with it.
    value=""
    disabled={disabled}
    onChange={(to) => onPick(to === REMOVE_VALUE ? "" : to)}
  >
    <Select.Option value="">Choose a replacement…</Select.Option>
    {[...choices]
      .sort((a, b) => a.order - b.order)
      .map((c) => (
        <Select.Option key={c.id} value={c.id} textValue={c.name}>
          <ColoredName name={c.name} color={c.color?.hexCode} />
        </Select.Option>
      ))}
    <Select.Option value={REMOVE_VALUE}>Remove this value</Select.Option>
  </Select.Root>
);

import React from "react";
import { ColorPip } from "./ColorPip";

export interface ColoredNameProps {
  name: string;
  /** The community colour's hex code, when the thing has one. */
  color?: string | null;
}

/**
 * A variant's or trait value's name, after its colour's pip when it has one.
 * Two siblings rather than a wrapper, so it lays out inside whatever flex row
 * holds it: a `Select.Option`, a `Cluster`.
 */
export const ColoredName: React.FC<ColoredNameProps> = ({ name, color }) => (
  <>
    {color && <ColorPip color={color} size="md" />}
    <span>{name}</span>
  </>
);

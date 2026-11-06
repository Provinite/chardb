import React from "react";
import { IconButton, Tooltip } from "@chardb/ui";
import * as styles from "./RandomCharacterButton.css";

interface RandomCharacterButtonProps {
  /** How many characters a pick chooses from. None disables the button. */
  count: number;
  onPick: () => void;
  /** A pick is on its way. */
  busy?: boolean;
  size?: "sm" | "md";
}

/** The dice: goes to a character picked at random from `count`. */
export const RandomCharacterButton: React.FC<RandomCharacterButtonProps> = ({
  count,
  onPick,
  busy = false,
  size = "md",
}) => {
  const label =
    count === 0
      ? "No characters available"
      : `Random character (${count.toLocaleString()} available)`;

  return (
    <div className={styles.root}>
      <Tooltip label={label}>
        <IconButton
          label={label}
          size={size}
          busy={busy}
          disabled={count === 0}
          onClick={onPick}
          icon={
            <span
              aria-hidden="true"
              className={size === "sm" ? styles.iconSmall : styles.icon}
            >
              🎲
            </span>
          }
        />
      </Tooltip>
    </div>
  );
};

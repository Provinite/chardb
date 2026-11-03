import { useId } from "react";
import { Stack } from "@chardb/ui";
import { CandyStrip } from "./CandyStrip";
import * as styles from "./DoorKnockToast.css";

export interface DoorKnockToastProps {
  /** Whose door it was. */
  name: string;
  knockerCandies: readonly string[];
  knockeeCandies: readonly string[];
}

function Side({ label, slugs }: { label: string; slugs: readonly string[] }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className={styles.label}>
        {label}
      </p>
      <CandyStrip slugs={slugs} />
    </div>
  );
}

/** What a door knock gave each side, as the knocker is told. */
export function DoorKnockToast({
  name,
  knockerCandies,
  knockeeCandies,
}: DoorKnockToastProps) {
  return (
    <Stack gap="sm">
      <Side label="You got" slugs={knockerCandies} />
      <Side label={`${name} got`} slugs={knockeeCandies} />
    </Stack>
  );
}

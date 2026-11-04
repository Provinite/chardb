import { Eye } from "lucide-react";
import { Button } from "@chardb/ui";
import * as styles from "./WatchButtonView.css";

export interface WatchButtonViewProps {
  watching: boolean;
  /** The status has not arrived yet, so the button claims neither state. */
  pending: boolean;
  /** A watch or unwatch is in flight. */
  busy?: boolean;
  onToggle: () => void;
}

/** Watch or unwatch a character, to hear when its availability changes. */
export function WatchButtonView({
  watching,
  pending,
  busy = false,
  onToggle,
}: WatchButtonViewProps) {
  const labelClass = (shown: boolean) =>
    shown && !pending ? styles.label : styles.inactiveLabel;

  return (
    <Button
      size="sm"
      tone={watching ? "secondary" : "outline"}
      icon={<Eye aria-hidden />}
      onClick={onToggle}
      busy={pending || busy}
      aria-label={pending ? "Loading watch status" : undefined}
    >
      <span className={styles.labels}>
        <span className={labelClass(!watching)}>Watch</span>
        <span className={labelClass(watching)}>Watching</span>
      </span>
    </Button>
  );
}

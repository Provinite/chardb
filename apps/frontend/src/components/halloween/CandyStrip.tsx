import { Cluster } from "@chardb/ui";
import { candyImageUrl, candyName } from "./candyBoard";
import * as styles from "./CandyStrip.css";

export interface CandyStripProps {
  slugs: readonly string[];
}

/** A row of candies' pictures, each named for screen readers. */
export function CandyStrip({ slugs }: CandyStripProps) {
  return (
    <Cluster gap="xs" className={styles.strip}>
      {slugs.map((slug, i) => (
        <img
          key={`${slug}-${i}`}
          className={styles.candy}
          src={candyImageUrl(slug)}
          alt={candyName(slug)}
          width={44}
          height={44}
        />
      ))}
    </Cluster>
  );
}

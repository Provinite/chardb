import React from "react";
import { Cluster, Grid, Stack } from "@chardb/ui";
import * as styles from "./AchievementList.css";

export interface AchievementListItem {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  earnedAt: string;
}

export interface AchievementListProps {
  achievements: readonly AchievementListItem[];
}

/** Achievements a member earned in one community, as cards. */
export const AchievementList: React.FC<AchievementListProps> = ({
  achievements,
}) => (
  <Grid as="ul" min="lg" className={styles.list}>
    {achievements.map((a) => (
      <Cluster
        as="li"
        key={a.id}
        gap="md"
        align="flex-start"
        className={styles.item}
      >
        <img
          className={styles.picture}
          src={a.imagePath}
          alt=""
          width={48}
          height={48}
        />
        <Stack gap="xs" className={styles.text}>
          <p className={styles.name}>{a.name}</p>
          <p className={styles.description}>{a.description}</p>
          <p className={styles.meta}>
            <time dateTime={a.earnedAt}>
              Earned {new Date(a.earnedAt).toLocaleDateString()}
            </time>
          </p>
        </Stack>
      </Cluster>
    ))}
  </Grid>
);

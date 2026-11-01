import React from "react";
import { Stack, Subtitle, Title } from "@chardb/ui";
import * as styles from "./AccessDenied.css";

/**
 * A page the viewer may not use. The message says what they lack, as one
 * sentence.
 */
export const AccessDenied: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Stack gap="sm" className={styles.denied}>
    <Title>Access Denied</Title>
    <Subtitle>{children}</Subtitle>
  </Stack>
);

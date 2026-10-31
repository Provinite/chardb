import { Button, Stack, Text, Title } from "@chardb/ui";
import * as styles from "./PageLoadError.css";

interface PageLoadErrorProps {
  onReload: () => void;
}

/** Stands in for a page that failed to load or render. */
export const PageLoadError: React.FC<PageLoadErrorProps> = ({ onReload }) => (
  <Stack as="section" gap="md" align="center" className={styles.panel}>
    <Title>This page couldn't load</Title>
    <Text>Reloading usually fixes it.</Text>
    <Button variant="primary" onClick={onReload}>
      Reload
    </Button>
  </Stack>
);

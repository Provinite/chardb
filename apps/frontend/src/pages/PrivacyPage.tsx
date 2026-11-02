import React from "react";
import { Markdown } from "../components/Markdown";
import { usePageMeta } from "../lib/pageMeta";
import privacyText from "../content/privacy.md?raw";
import * as styles from "./PrivacyPage.css";

/** What CharDB stores about people and who sees it, from `content/privacy.md`. */
export const PrivacyPage: React.FC = () => {
  usePageMeta({ title: "Your data" });

  return (
    <article className={styles.page}>
      <Markdown>{privacyText}</Markdown>
    </article>
  );
};

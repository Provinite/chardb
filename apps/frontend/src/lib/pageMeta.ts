/**
 * Per-page document metadata: the tab title, and the OpenGraph tags beside it.
 *
 * **What this is not.** No link unfurler executes JavaScript. Discord, Slack,
 * Twitter/X, Facebook and iMessage fetch `index.html` and parse the `<head>`
 * they are handed, so nothing written here has ever been seen by one of them
 * and nothing written here ever will be. A pasted character link still unfurls
 * as the site card in `index.html`. Fixing that needs the `<head>` to differ
 * before the bundle runs, which means rendering it server-side for crawlers;
 * that does not exist yet, and adding these tags does not bring it closer.
 *
 * What it is for, in descending order of how much it matters: the browser tab
 * and history entry, which currently say "CharDB - Character Hub" on all 60-odd
 * routes; bookmarks and the share sheet on mobile, which read `document.title`;
 * and Googlebot, which does render JavaScript, so this is the copy it indexes.
 *
 * The OG tags are kept in sync with the title here anyway, because a page whose
 * `<head>` disagrees with itself is the kind of thing that is discovered much
 * later, and because an in-app "copy link" preview would read them.
 */
import { useEffect } from "react";

export interface PageMeta {
  /** Page name, without the site suffix -- "Ash", not "Ash | CharDB". */
  title: string;
  /** One or two sentences. Long values are truncated, not wrapped. */
  description?: string | null;
  /** Absolute image URL. Relative paths are not resolved for you. */
  image?: string | null;
  /** `og:type`; `profile` for a person's page. */
  type?: "website" | "profile" | "article";
}

const SITE_NAME = "CharDB";

const DEFAULT_DESCRIPTION =
  "A home for original characters: profiles, art galleries, species and the communities built around them.";

/**
 * Longest description emitted. Consumers truncate somewhere between ~150 and
 * ~300 characters; cutting at 200 on a word boundary means we choose where the
 * ellipsis lands rather than letting each of them choose differently.
 */
const DESCRIPTION_MAX = 200;

/**
 * Flatten to one line and cut to `DESCRIPTION_MAX`, preferring a word boundary.
 *
 * The boundary is only honoured when it is near the end of the cut. Backing up
 * to the last space unconditionally means a description holding one long
 * unbroken token -- a URL in a bio is the realistic case -- throws away
 * everything after the last space before it, so a 400-character bio can render
 * as two words and an ellipsis. Below the threshold a hard cut mid-token loses
 * less.
 */
const WORD_BOUNDARY_MIN = Math.floor(DESCRIPTION_MAX * 0.75);

const truncate = (text: string): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= DESCRIPTION_MAX) return flat;

  const cut = flat.slice(0, DESCRIPTION_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace >= WORD_BOUNDARY_MIN ? cut.slice(0, lastSpace) : cut}…`;
};

/**
 * Set (or create) one meta tag.
 *
 * OpenGraph identifies tags by `property`, the HTML spec and Twitter by `name`,
 * so which attribute to match on is part of the tag's identity rather than a
 * detail -- querying the wrong one creates a duplicate beside the tag already
 * in `index.html`.
 */
const setTag = (attr: "property" | "name", key: string, value: string) => {
  const selector = `meta[${attr}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
};

const removeTag = (attr: "property" | "name", key: string) => {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
};

/** Apply `meta` to the live document. Exported for tests. */
export const applyPageMeta = (meta: PageMeta): void => {
  const title = `${meta.title} | ${SITE_NAME}`;
  const description = meta.description
    ? truncate(meta.description)
    : DEFAULT_DESCRIPTION;

  document.title = title;
  setTag("name", "description", description);
  setTag("property", "og:title", meta.title);
  setTag("property", "og:description", description);
  setTag("property", "og:type", meta.type ?? "website");
  setTag("property", "og:url", window.location.href);

  if (meta.image) {
    setTag("property", "og:image", meta.image);
    setTag("name", "twitter:card", "summary_large_image");
  } else {
    // Left over from the previous route otherwise, which is how one character's
    // art ends up captioned with another character's name.
    removeTag("property", "og:image");
    setTag("name", "twitter:card", "summary");
  }
};

/**
 * Describe the current page.
 *
 * Pass `null` while the data is still loading and the tags are left alone --
 * the previous page's title stays up for the length of the fetch, which reads
 * better than a flash of "Loading | CharDB" in the tab.
 *
 * There is no cleanup: the next route that calls this overwrites what this one
 * set. Restoring the site defaults on unmount would mean every navigation
 * briefly showed them, and a route that does not call this hook at all is
 * showing the previous title either way.
 */
export const usePageMeta = (meta: PageMeta | null): void => {
  const { title, description, image, type } = meta ?? {};

  useEffect(() => {
    if (!title) return;
    applyPageMeta({ title, description, image, type });
  }, [title, description, image, type]);
};

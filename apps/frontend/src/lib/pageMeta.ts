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
 * and history entry, which said "CharDB - Character Hub" on every one of the
 * site's routes before this; bookmarks and the share sheet on mobile, which
 * read `document.title`; and Googlebot, which does render JavaScript, so this
 * is the copy it indexes.
 *
 * The OG tags are kept in sync with the title here anyway, because a page whose
 * `<head>` disagrees with itself is the kind of thing that is discovered much
 * later, and because an in-app "copy link" preview would read them.
 */
import { useEffect } from "react";
import { stripMarkdown } from "./stripMarkdown";

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

/**
 * Strip markdown, flatten to one line, then cut.
 *
 * Character details, gallery and media descriptions and user bios are markdown,
 * and nothing that reads `og:description` renders it: Discord, Slack and
 * Google's snippet print the string they are given. A character whose details
 * open with a heading was unfurling as `# About Ash This is a **test**...`.
 *
 * The stripping is first, not last. Cutting first would land the truncation
 * inside the syntax and leave a dangling `**`, and would spend part of the 200
 * characters on markup rather than on words.
 *
 * Plain text passes through `stripMarkdown` unchanged, which matters because
 * the generated fallbacks ("Posted by some_user_name") come through here too.
 */
const truncate = (text: string): string => {
  const flat = stripMarkdown(text).replace(/\s+/g, " ").trim();
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
 * Describe the current page. Every routed page calls this.
 *
 * `title` is required rather than nullable, and that is the whole mechanism
 * that keeps titles correct. There is no cleanup here and no route-level
 * fallback anywhere: the title is only ever right because the page that is
 * mounted has set it. A page that returned early without calling this would
 * leave the previous page's title in the tab -- so a character's name would
 * still be sitting above `/dashboard`, and bookmarking there would name the
 * bookmark after a character.
 *
 * A page whose title depends on data it is still fetching supplies a generic
 * one until the data lands -- `data?.species?.name ?? "Species"` -- rather than
 * skipping the call. The tab then reads "Species", then "Sylvanine", and never
 * reads whatever the last page was.
 */
export const usePageMeta = ({
  title,
  description,
  image,
  type,
}: PageMeta): void => {
  useEffect(() => {
    applyPageMeta({ title, description, image, type });
  }, [title, description, image, type]);
};

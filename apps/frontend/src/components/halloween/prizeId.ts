const PRIZE_ID_MAX = 25;

/**
 * A prize id suggested from a name: lowercase letters and hyphens, starting
 * with a letter, cut at a word to fit. Empty when the name has too few
 * letters to make one. NFKD splits accents off their letters, so "é" turns
 * into "e" plus a mark the hyphen run swallows.
 */
export const prizeIdFrom = (name: string): string => {
  let id = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (id.length > PRIZE_ID_MAX) {
    const cut = id.slice(0, PRIZE_ID_MAX + 1);
    const lastBreak = cut.lastIndexOf("-");
    id = lastBreak > 0 ? cut.slice(0, lastBreak) : cut.slice(0, PRIZE_ID_MAX);
  }
  return id.length >= 2 ? id : "";
};

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import strip from "strip-markdown";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(strip)
  .use(remarkStringify);

/**
 * Undo `remark-stringify`'s escaping.
 *
 * The pipeline above ends by serialising back to markdown, and that step
 * escapes every character that could start a construct -- so a bio reading
 * `some_user_name` comes out as `some\_user\_name`, and the backslashes are
 * shown to the reader. Escaping is correct for markdown output and wrong here,
 * because the caller wants plain text.
 *
 * This inverts exactly what that step did rather than stripping backslashes
 * generally: only a backslash followed by ASCII punctuation is removed, which
 * is precisely the set CommonMark allows to be escaped. A lone backslash in
 * prose (`C:\dir`) is not escaped on the way out and is not touched here.
 */
const unescapePunctuation = (text: string): string =>
  text.replace(/\\([!-/:-@[-`{-~])/g, "$1");

/** `markdown` as plain text, with every construct and escape removed. */
export function stripMarkdown(markdown: string): string {
  return unescapePunctuation(String(processor.processSync(markdown))).trim();
}

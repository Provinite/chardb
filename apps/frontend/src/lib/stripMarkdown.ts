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

export function stripMarkdown(markdown: string): string {
  return String(processor.processSync(markdown)).trim();
}

/** Every stylesheet vanilla-extract has injected into the test document. */
export const emittedCss = () =>
  [...document.querySelectorAll("style")]
    .map((style) => style.textContent)
    .join("\n");

/** A class name as a CSS selector, with characters such as `:` and `.` escaped. */
export const classSelector = (className: string) =>
  `.${className.replace(/[^\w-]/g, "\\$&")}`;

/** The declarations of whichever of `classNames` has a rule containing `text`. */
export const ruleContaining = (classNames: string, text: string) =>
  classNames
    .split(" ")
    .map((cls) => declarationsFor(classSelector(cls)))
    .find((css) => css?.includes(text));

/** `css` with every at-rule block removed, leaving top-level rules. */
const withoutAtRules = (css: string) => {
  let out = "";
  let depth = 0;
  for (let i = 0; i < css.length; i++) {
    if (depth === 0 && css[i] === "@") {
      const open = css.indexOf("{", i);
      if (open === -1) break;
      depth = 1;
      i = open;
      continue;
    }
    if (depth > 0) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") depth--;
      continue;
    }
    out += css[i];
  }
  return out;
};

/** Like `declarationsFor`, but only rules outside any at-rule. */
export const topLevelDeclarationsFor = (selector: string) =>
  matchDeclarations(withoutAtRules(emittedCss()), selector);

/** The body of every block opened by `atRule {`, matched by brace depth. */
const atRuleBodies = (css: string, atRule: string) => {
  const bodies: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf(`${atRule} {`, from);
    if (start === -1) return bodies;
    const open = start + atRule.length + 2;
    let depth = 1;
    let i = open;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") depth--;
    }
    bodies.push(css.slice(open, i - 1));
    from = i;
  }
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The declarations of the first rule whose selector is exactly `selector`,
 * optionally inside an at-rule whose prelude is `atRule`.
 */
export const declarationsFor = (selector: string, atRule?: string) => {
  const css = emittedCss();
  if (!atRule) return matchDeclarations(css, selector);
  const block = atRuleBodies(css, atRule).join("\n");
  return block ? matchDeclarations(block, selector) : undefined;
};

function matchDeclarations(css: string, selector: string) {
  const match = css.match(
    new RegExp(`(?:^|[\\s}])${escape(selector)}\\s*{([^}]*)}`),
  );
  return match?.[1].trim();
}

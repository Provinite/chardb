# Frontend

Before writing or changing any style or styled component, read [STYLING.md](./STYLING.md) in full. The rules below are a reminder of the ones most often broken, not a substitute for it.

- STYLING.md outranks WCAG. WCAG criteria it does not mention are very low severity.
- No new styled-components. Styles go in an adjacent `Foo.css.ts` (vanilla-extract), imported as `import * as styles from "./Foo.css"`. Migrating a file converts all of it.
- Every colour, length, font, radius, shadow, duration, easing and `z-index` is a theme token. Colours are semantic (`text.muted`, `action.primary.bgHover`); use only the foreground/background pairs the theme lists, for the use they are listed for.
- Duration tokens are for animation only; timers use `timing.*`.
- Mobile-first. Base styles are the phone layout, designed at 360px; nothing scrolls sideways at 320px. Breakpoints come from sprinkles or `mq()`, container queries from `cq()` in `rem`; never a hand-written `@media` or `@container`. One source per property per element: sprinkles or the local style, not both.
- Use the layout primitives (`Stack`, `Cluster`, `Grid`, `Switcher`, `Sidebar`) before writing flex or grid rules.
- Share a style when two places represent the same thing, not when they happen to match. Ask whether changing one means you'd want to change the other.
- Shared components compose from parts; add a part, not a prop. `DataTable` renders one set of rows; never duplicate DOM to switch layouts.
- Truncate only on purpose, and only with `Truncate`.
- `:hover` only inside the hover condition. Touch targets aim for 44×44px and never go under 24×24px. Information people need goes in a toggletip, never a hover-only tooltip.
- Focus rings are outlines, not just box-shadows, so they survive forced-colour mode.
- Keep visual order equal to source order unless the reorder is harmless and commented. Every drag needs a tap alternative. Nothing completes on pointer down.
- No `!important`. No `style={{}}` except runtime values via `assignInlineVars`.

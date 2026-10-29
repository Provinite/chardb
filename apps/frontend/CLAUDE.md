# Frontend

Read [STYLING.md](./STYLING.md) before writing or changing any styles. The rules below are the ones most often broken; STYLING.md has the reasons and the patterns.

- No new styled-components. Styles go in an adjacent `Foo.css.ts` (vanilla-extract), imported as `import * as styles from "./Foo.css"`. Migrating a file converts all of it.
- Every colour, length, radius, shadow, duration and `z-index` is a theme token. Colours are semantic (`text.muted`, `action.primary.bgHover`); use only the foreground/background pairs the theme lists.
- Mobile-first. Base styles are the 360px phone layout. Breakpoints come from sprinkles or `mq()`, never a hand-written `@media`. One source per property per element: sprinkles or the local style, not both.
- Use the layout primitives (`Stack`, `Cluster`, `Grid`, `Switcher`, `Sidebar`) before writing flex or grid rules.
- Share a style when two places represent the same thing, not when they happen to match. Ask whether changing one means you'd want to change the other.
- Shared components compose from parts; add a part, not a prop.
- `:hover` only inside the hover condition. Touch targets aim for 44×44px and never go under 24×24px (WCAG 2.5.5 / 2.5.8; exceptions in STYLING.md). Nothing important is hover-only.
- No `!important`. No `style={{}}` except runtime values via `assignInlineVars`.

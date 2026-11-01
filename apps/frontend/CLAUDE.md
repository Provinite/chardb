# Frontend

Before writing or changing any style or styled component, read [STYLING.md](./STYLING.md) in full. The rules below are a reminder of the ones most often broken, not a substitute for it.

Before adding or splitting a component, read [ARCHITECTURE.md](./ARCHITECTURE.md). Data components fetch and pass props down; presentational components take props, render from `@chardb/ui` parts, and never import Apollo, the router or app contexts.

Never write a TypeScript type, interface or string union that restates a GraphQL type. Shapes of query data come from codegen: put a fragment in the `src/graphql/*.graphql.ts` document, run `yarn workspace @chardb/frontend codegen`, and use the generated `…FieldsFragment` type and enums (`HalloweenWinnerKind.Member`, not `"MEMBER"`). This holds in presentational components, which may `import type` from `generated/graphql`, and in test fixtures. A hand-written copy keeps compiling after the schema changes.

- STYLING.md outranks WCAG. WCAG criteria it does not mention are very low severity.
- Tests that check emitted CSS read it through `src/__tests__/emittedCss.ts`, which parses with PostCSS. Never parse CSS or selectors with regexes or string searches.
- No new styled-components. Styles go in an adjacent `Foo.css.ts` (vanilla-extract), imported as `import * as styles from "./Foo.css"`. Migrating a file converts all of it and removes it from `styled-components-allowlist.json`.
- Every colour, length, font, radius, shadow, duration, easing and `z-index` is a theme token. Colours are semantic (`text.muted`, `action.primary.bgHover`); use only the foreground/background pairs the theme lists, for the use they are listed for.
- Dark mode is never allowed to flash. The theme preference is a root-domain cookie (not `localStorage`, which is per subdomain), applied by the inline script in `index.html` before first paint. Anything that paints a background, including `html`, dialogs and placeholders, uses a theme token.
- Duration tokens are for transitions and one-shot animations; timers use `timing.*`. Looping animations go through `loop()` (decorative loops stop under reduced motion, essential ones slow down).
- Mobile-first. Base styles are the phone layout, designed at 360px; nothing scrolls sideways at 320px. Breakpoints come from sprinkles or `mq()`, container queries from `cq(container, { [containers.md]: rules })` with thresholds from the `containers` scale; never a hand-written `@media` or `@container`. One source per property per element: sprinkles or the local style, not both.
- Use the layout primitives (`Stack`, `Cluster`, `Grid`, `Switcher`, `Sidebar`) before writing flex or grid rules.
- Share a style when two places represent the same thing, not when they happen to match. Ask whether changing one means you'd want to change the other.
- Shared components compose from parts; add a part, not a prop. `DataTable` is a CSS grid with ARIA table roles, not a `<table>`, and renders one set of rows; never duplicate DOM to switch layouts.
- Grid column proportions come from `split[...]` or the `track.*` helpers, not hand-written `grid-template-columns`.
- No pop-in: nothing moves because something else appeared, loaded or changed state. Prefer disabling to removing, reserve space for what arrives later (skeletons, image dimensions, message slots), overlay rather than push, and keep every state the same size.
- Loading: skeletons for first loads (no delay), spinners only inside controls, determinate bars for known progress, a top progress bar for route changes. Never swap content on screen for a skeleton or a busy button's label for text. Other indicators wait 500ms and stay at least 500ms.
- The startup screen is the `AppLoader` animation in `index.html`, beside `#root`; it fades out after sign-in and the first page render and never comes back. Don't render a loader in React during startup.
- Truncate only on purpose, and only with `Truncate` (tap or click expands everywhere; the hover tooltip is an extra).
- `:hover` only inside the hover condition. Touch targets aim for 44×44px and never go under 24×24px. Information people need goes in a toggletip, never a hover-only tooltip.
- Focus rings are outlines, not just box-shadows, so they survive forced-colour mode.
- Keep visual order equal to source order unless the reorder is harmless and commented. Every drag needs a tap alternative. Nothing completes on pointer down.
- No `!important`. No `style={{}}` except runtime values via `assignInlineVars`.

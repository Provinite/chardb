# Styling

How the frontend and `@chardb/ui` are styled. How components divide the work between them is in [ARCHITECTURE.md](./ARCHITECTURE.md). These conventions apply to every file written or migrated under the mobile work (#427). Files not yet migrated still use styled-components; leave them as they are unless you are migrating them.

**This guide outranks WCAG.** Where a rule here differs from a WCAG criterion, follow the rule here. WCAG criteria this guide (or other repo-specific documentation) does not mention are very low severity: meet them when it is cheap, never block work on them.

## Stack

- **[vanilla-extract](https://vanilla-extract.style/)** compiles styles written in TypeScript to static CSS at build time.
- **Sprinkles** (`@vanilla-extract/sprinkles`) for responsive layout values.
- **Recipes** (`@vanilla-extract/recipes`) for component variants.
- **`postcss-sort-media-queries`** (`mobile-first`) sorts each file's media queries smallest-first after vanilla-extract emits them.

## Files

Styles live next to their component:

```
CharacterCard.tsx
CharacterCard.css.ts
```

```tsx
import * as styles from "./CharacterCard.css";

<article className={styles.card}>
```

- Add no new styled-components (`no-styled-components`). Files that still use it are listed in `apps/frontend/styled-components-allowlist.json`; a migrated file comes off the list in the same change. When you migrate a file, convert all of it; a file is either styled-components or vanilla-extract.
- `style={{}}` is for values only known at runtime (a crop offset, a user-picked colour). Pass them as CSS variables with `assignInlineVars` so the stylesheet still owns the declaration.

## Tokens

Every colour, space, size, border width, font family, font size, font weight, line height, radius, shadow, duration, easing and layer comes from the theme in `packages/ui/src/theme/`. A literal value in a `*.css.ts` file is a lint error: `no-raw-color`, `no-raw-length`, `no-raw-font` and `no-raw-radius-shadow`. Values that are not design decisions stay literal: `0`, percentages, `fr`, `auto`, keywords such as `none` or `inherit`, and unitless line heights. Two exceptions: `z-index` takes a layer token even for `0` (see [Layers](#layers)), and a radius takes a token even for a circle (`radius.full`, not `50%`).

Tokens are CSS custom properties. Light and dark themes set the same properties, switched by `data-theme` on `<html>`, so a theme change re-renders nothing.

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const card = style({
  background: vars.surface.raised,
  padding: vars.space.md,
  borderRadius: vars.radius.md,
});
```

`vars` has one key per family: `surface`, `text`, `border`, `action`, `status`, `space`, `size`, `borderWidth`, `font` (`family`, `size`, `weight`, `lineHeight`), `radius`, `shadow`, `layer`, `motion` and `timing`. Each property is named after its path, so `vars.action.primary.bgHover` is `--action-primary-bgHover` in devtools.

`*.css.ts` files import from `@chardb/ui/theme`, never `@chardb/ui`. The style compiler runs each file's imports at build time, and the root entry would pull in every component. `no-restricted-imports` enforces it.

| File in `packages/ui/src/theme/` | Holds |
|---|---|
| `palette.ts` | Raw colours |
| `tokens.ts` | Token values for each theme, and the reduced-motion durations |
| `contract.css.ts` | `vars` |
| `theme.css.ts` | Assigns the values to `:root` and each `data-theme` |
| `pairs.ts` | Colour pairs and their floors |
| `legacy.ts` | `lightTheme` and `darkTheme` for styled-components, read from the same palette |

### Dark mode

The chosen theme is respected at every moment, for everyone: no frame of the page ever paints in the other theme.

- **The preference lives in a cookie on the root domain**, so the apex and every community subdomain share it. `localStorage` is per origin and would give each subdomain its own answer. The cookie holds `light`, `dark` or `system`, and is written only when the user picks; `system` follows `prefers-color-scheme` live.
- **The theme is set before the first paint.** A synchronous inline script, first in `<head>`, reads the cookie and sets `data-theme` and `color-scheme` on `<html>`. An inline `<style>` in `<head>` gives `html` the page background for both themes, plus a `prefers-color-scheme` rule for when scripts are off. The browser's default white never shows.
- **The background is on `html`**, not only `body` or `#root`, so overscroll and the canvas behind the page match.
- **`color-scheme`** is set per theme, so scrollbars, form controls and other browser-drawn parts follow it. `<dialog>` and `::backdrop` get token backgrounds.
- **`<meta name="theme-color">`** matches the theme, so the mobile browser's toolbar does too, and changes with it.
- **Switching theme** swaps CSS variables; nothing re-renders, and nothing in between paints.

### Colour

Colours are named for what they do, never for what they look like. `text.muted`, not `grey500`.

Two tiers:

1. **Palette**: raw values. Private to the theme module; nothing else imports it.
2. **Semantic tokens**: what components use. Each maps to a palette value per theme.

Semantic families:

| Family | For |
|---|---|
| `surface.*` | Backgrounds: `page`, `raised`, `raisedHover` for a raised control under the pointer, `sunken`, and `overlay` for scrims |
| `text.*` | Text and icons: `default`, `muted`, `subtle`, `link`, `linkHover`, and `inverse` for text on a filled status colour |
| `border.*` | `default` for dividers, `input` for input outlines, `focus` for focus rings |
| `action.*` | Interactive controls: `primary`, `secondary` and `danger`, each with `bg`, `bgHover`, `bgPressed`, `bgSubtle`, `bgDisabled`, `fg`, `fgDisabled` and `border` |
| `status.*` | `success`, `warning`, `danger` and `info` messages, each with `bg`, `bgSubtle`, `fg` and `border` |

Every state or shade a component may use is its own token: `action.primary.bgHover`, `action.primary.bgPressed`, `action.primary.bgDisabled`, `status.danger.bgSubtle`. Components never lighten, darken, mix or add alpha themselves. If a shade you need is missing, add a token.

**Pairs.** The theme (`pairs.ts`) lists which foregrounds may sit on which backgrounds, and what each pair is for: body text, large text, or non-text (icons, borders, focus rings). `text.default` on `surface.raised` for body text is a pair; `text.muted` on `action.primary.bg` is not, unless the list says so. Use only listed pairs, and only for the use they are listed for. A pair listed for large text is not a body text pair.

**Contrast.** A unit test checks every listed pair in both themes against its use: 4.5:1 for body text, 3:1 for large text and non-text. The formula is the default, not the final word; a person looking at the pair decides borderline cases, in either direction. When a pair is approved despite failing the formula, record the approved ratio on the pair as its floor, with a one-line comment saying why, so nobody reopens it. The test then holds that pair to its floor instead of the standard threshold: a later palette change that pushes it lower still fails.

### Forced colours

Windows High Contrast and other forced-colour modes replace colours with system ones and remove `box-shadow`. Build so nothing disappears:

- The focus ring is an `outline`, never a `box-shadow` alone.
- Cards, inputs and other surfaces separated from their background only by colour also get a transparent border, `borderWidth.hairline` wide. Forced-colour mode draws it in a visible system colour.
- Icons use `currentColor`.

### Layers

`z-index` comes from the layer scale only (`no-raw-z-index`):

| Layer | `base` | For |
|---|---|---|
| `layer.page` | 0 | Normal flow |
| `layer.sticky` | 1000 | Sticky headers, pinned table columns |
| `layer.dropdown` | 2000 | Menus, popovers, typeahead lists |
| `layer.overlay` | 3000 | Drawer backdrop, the navigation drawer |
| `layer.modal` | 4000 | Dialogs |
| `layer.toast` | 5000 | Toasts |

The one literal allowed is `-1`, which puts an element behind its siblings inside its parent's stacking context.

Each layer is a group: `layer.modal.base` is 4000, and `layer.modal[100]`, `layer.modal[200]` and `layer.modal[300]` are 4100, 4200 and 4300, for stacking inside one layer, such as a popover opened from a dialog. The steps are an escape hatch: leave a comment saying why. The gaps between them leave room for a new step without renaming the others.

Elements opened with `<dialog>.showModal()` or the Popover API render in the browser's top layer, above every `z-index`. If dialogs use it, anything that must appear above an open dialog (a toast, a menu opened from inside it) must use the top layer too, or render inside the dialog.

### Motion

Durations and easings are tokens, for transitions and animations only. A literal `200ms` is a lint error (`no-raw-motion`).

- **Transitions and one-shot animations** use the ordinary duration tokens. Under `prefers-reduced-motion: reduce` the theme sets them to `0.01ms`: the change is effectively instant, and `transitionend` and `animationend` still fire, so a drawer that unmounts when its transition ends keeps working.
- **Looping animations** (any infinite iteration count) never use the ordinary duration tokens; at `0.01ms` a loop would cycle thousands of times a second and flicker. Write them with the shared `loop()` helper, which picks one of two behaviours:
  - **Decorative** loops (skeleton shimmer, a pulsing badge) stop under reduced motion.
  - **Essential** loops that show something is happening (a loading spinner) use `motion.duration.essential`, which reduced motion slows but never stops, so the spinner never looks frozen.

  `loop()` returns a style rule to compose with the element's own style:

  ```ts
  const spin = keyframes({ to: { transform: "rotate(1turn)" } });

  export const spinner = style([
    loop({ kind: "essential", keyframes: spin }),
    { width: vars.size.target.min },
  ]);
  ```

  A decorative loop takes `duration` (a motion token, default `motion.duration.essential`); both take `easing` (default `motion.easing.linear`).

  `infinite` outside `loop()` is a lint error (`loop-via-helper`).
- **Timers** (toast lifetime, tooltip delay, debounce) have their own `timing.*` tokens, which reduced motion leaves alone. Never time something with a duration token. `vars.timing.*` is for CSS such as `animation-delay`; JavaScript timers read the same values in milliseconds from `timingMs`.
- **Smooth scrolling.** The theme sets `scroll-behavior: auto` under reduced motion. In code, scroll with `scrollToElement(el, options)` and `scrollToPosition(position, el?)` from `@chardb/ui` instead of `scrollIntoView` and `scrollTo`; they scroll smoothly, or jump when the user prefers reduced motion.

## Breakpoints

Mobile-first. Base styles are the phone layout; conditions add layout as width grows. Design for 360px. At 320px nothing may scroll sideways either ([1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): 320px is a 1280px screen at 400% zoom). That is the same base layout, not another breakpoint; rows that wrap, no fixed widths and `min-width: 0` on flex children are usually all it takes. Data tables are exempt and may scroll inside their container.

| Name | Query | At default font size |
|---|---|---|
| base | none | under 640px |
| `sm` | `min-width: 40em` | 640px |
| `md` | `min-width: 48em` | 768px |
| `lg` | `min-width: 64em` | 1024px |
| `xl` | `min-width: 80em` | 1280px |
| `xxl` | `min-width: 96em` | 1536px |

Queries are in `em` so breakpoints follow the user's browser font size.

The breakpoint helpers, like every style helper, come from `@chardb/ui/theme`.

- **Sprinkles** carry responsive values for layout: `sprinkles({ flexDirection: { base: "column", md: "row" } })`. They cover `display`, flex direction, wrap and alignment, `gap`, and padding (with `padding`, `paddingX` and `paddingY` shorthands), taking space tokens by name (`gap: "md"`, or `"none"` for zero). Components call `sprinkles()` when rendering, so it is also exported from `@chardb/ui`.
- **`mq("md")`** builds the query for anything sprinkles does not cover, as a key under `"@media"`: `"@media": { [mq("md")]: { flexDirection: "row" } }`. Never write a query string by hand; it is a lint error (`no-raw-media`, which covers `@container` too).
- **One source per property.** If sprinkles sets an element's `padding`, its local `style()` does not, and the reverse. Sprinkles and local styles live in different files, and which one wins depends on import order.
- `md` and `lg` do most structural work (sidebar becomes drawer, one column becomes two). `sm` refines. `xl` and `xxl` mostly cap content width.
- The navigation sidebar is a column `size.sidebar` wide from `md`, and a drawer below it. Open, the drawer is modal: the app makes the rest of the page `inert`.
- A layout that already adapts without a breakpoint (a wrapping row, an `auto-fit` grid) gets none.

### Container queries

A component that appears in slots of different widths (cards, panels, anything that may sit beside a sidebar) responds to its container, not the viewport.

```ts
export const panel = createContainer();

export const wrap = style({ containerName: panel, containerType: "inline-size" });

export const body = style({
  display: "block",
  "@container": cq(panel, {
    [containers.sm]: { display: "flex" },
    [containers.lg]: { gap: vars.space.lg },
  }),
});
```

- `cq()` is to `@container` what `mq()` is to `@media`: the only way to write the condition. It takes every threshold for one container at once and returns the contents of the `@container` key, so a component with several thresholds still has one `@container` key.
- `cq()` emits the thresholds smallest-first, whatever order they are written in. `postcss-sort-media-queries` sorts only `@media`, so container queries rely on the helper for their order.
- A component that queries two containers merges them: `"@container": { ...cq(card, {...}), ...cq(page, {...}) }`.
- Thresholds come from the `containers` scale in `@chardb/ui/theme`, not from the viewport breakpoints:

  | Name | `xs` | `sm` | `md` | `lg` | `xl` |
  |---|---|---|---|---|---|
  | Width | 20rem | 30rem | 40rem | 50rem | 60rem |

  Pick the step nearest to where the component's layout breaks; if none is close, add a step. They are plain numbers rather than `vars`, because a container query cannot read a CSS variable.
- Thresholds are numbers of `rem`; `cq()` adds the unit. Numbers keep lengths out of the source as strings, so the no-literal-length rule holds without an exemption, and `cq()` can only ever emit `rem`. An `em` in a container query is measured against the container's own font size, so it would shift when that text is resized. Leave the root font size at the browser default, so `rem` follows the user's setting.

## Layout

Layout primitives in `@chardb/ui` own the flex and grid patterns the app repeats:

| Primitive | Does | Takes |
|---|---|---|
| `Stack` | Vertical flow with a gap | `gap` (default `md`), `align` |
| `Cluster` | Horizontal row that wraps: toolbars, tag lists, action bars | `gap` (default `sm`), `align` (default `center`), `justify` |
| `Grid` | Columns that fit as many items as the width allows | `min`, a `size.column` name; `repeat`, `fit` (default) or `fill`; `gap` |
| `Switcher` | A row whose children share the width equally, and stack below a container width | `stackBelow`, a `containers` name; `gap` |
| `Sidebar` | `Sidebar.Root` holds `Sidebar.Main` and `Sidebar.Side`, side by side, stacked below a container width | Root: `stackBelow`, `gap` (default `lg`). Side: `width`, a `size.column` name |

```tsx
<Sidebar.Root stackBelow="lg">
  <Sidebar.Main>…</Sidebar.Main>
  <Sidebar.Side as="aside" width="xl">…</Sidebar.Side>
</Sidebar.Root>
```

- Every primitive takes `as` (`div`, `section`, `article`, `aside`, `nav`, `header`, `footer`, `main`, `form`, `fieldset`, `ul`, `ol` or `li`), with that element's own attributes (`as="form"` takes `noValidate`), and forwards `ref` and `className`.
- `gap`, `align` and `justify` are sprinkles values, so they take one per breakpoint: `gap={{ base: "sm", md: "lg" }}`. The primitive owns them; a `className` passed in sets neither gap nor alignment.
- `Switcher` and `Sidebar.Root` render a container `div` around their layout element. The container is sized as if it were empty, so it takes its width from its parent: in a flex row, a centred `Stack` or an `auto` grid track it collapses unless placed. `className` goes on the container, to place it (`flex: 1`, a grid area); `as`, `ref` and other props go on the layout element.
- `Grid` clamps its minimum to the grid's width, so one column never overflows a grid narrower than `min`. `fill` keeps empty columns, so a short last row stays at one item width.
- `Sidebar` is a layout inside a page. The app's navigation sidebar is a separate component.

Reach for a primitive before writing `display: flex`. A one-off flex rule in a component is fine when no primitive fits; three of the same one-off is a missing primitive.

### Proportional grids

Column proportions come from `@chardb/ui`, not hand-written `grid-template-columns`.

**Ready-made splits** cover the common cases as classes: `split["1:1"]`, `split["2:1"]`, `split["1:2"]`, `split["1:1:1"]`, `split["3:1"]`. Each is a grid whose columns share the width in that ratio. A split sets no gap; give it one from sprinkles or the element's own style. Combine with `mq()` or a `Switcher` when the split should stack on phones.

**Track helpers** build anything else:

| Helper | Emits | For |
|---|---|---|
| `track.fr(2)` | `minmax(0, 2fr)` | A share of the remaining width |
| `track.fr(1, vars.size.column.md)` | `minmax(<token>, 1fr)` | A share that never shrinks below a size |
| `track.fixed(vars.size.column.sm)` | the token | A fixed-width column: dates, amounts, avatars |
| `track.content` | `max-content` | A column as wide as its content (not in `DataTable`) |

`track.fr` uses `minmax(0, …)` rather than a bare `fr` on purpose: a bare `1fr` cannot shrink below its content's width, so one long word can push the grid wider than its container.

### Shared styles

Shared `style()` fragments live in `packages/ui/src/styles/` for non-layout needs that recur. They are classes, exported from `@chardb/ui/theme`; compose them with `style([focusRing, { … }])`.

| Fragment | Is |
|---|---|
| `focusRing` | An outline on `:focus-visible`, `size.focusOffset` outside the control |
| `visuallyHidden` | Out of view and out of the layout, still read by screen readers |
| `cardSurface` | `surface.raised` with a transparent hairline border, for forced colours |
| `interactiveSurface` | A card surface with the focus ring that turns `surface.raisedHover` under the pointer |

Share a style when two places **represent the same thing**, not when they **happen to look the same**. Ask: if I change one, will I wish I had changed the other, and would I have to remember to? If yes, share it, even between two components, when the link is that clear. If the match is coincidence, leave both alone; merging them couples things that will drift apart.

Repetition is the backstop: three copies of the same declarations means something is missing from the pool.

### No pop-in

Nothing on the page moves because something else appeared, disappeared, loaded or changed state. When content changes, the layout around it holds still.

- **Change state instead of presence.** Disable a button rather than removing it; show an empty or zero state rather than nothing. A control that comes and goes makes everything after it jump.
- **Reserve space for what arrives later.** Loading states are skeletons the size of the content they stand in for. Images carry `width` and `height` or an `aspect-ratio`. A slot for an error or hint under a field keeps its `min-height` whether or not there is a message.
- **Keep a hidden element's space** with `visibility: hidden` when it will come back in the same place; `display: none` only when its space should go too.
- **Overlay rather than push.** Toasts, menus, tooltips and popovers float above the page; they never insert themselves into the flow.
- **States keep their size.** Hover, focus, selected and active never change border width, padding or font weight. Use the focus ring, colour or a border that is always there and only changes colour. A tab that turns bold when selected reserves the bold width up front.
- **Changing numbers** (counts, balances, timers) use `font-variant-numeric: tabular-nums`, so digits do not shift as the value changes.
- **Scroll containers** whose content can grow past them set `scrollbar-gutter: stable`, so a scrollbar appearing does not narrow the content.

### Truncation

Truncating text is a design choice; use it on purpose, not to hide an overflow you did not plan for. Always truncate with `Truncate` from `@chardb/ui`, which makes the full text reachable:

- A tap or click expands the text in place, on every device. Truncated text is a control (`aria-expanded`), so Enter and Space expand it too.
- A tooltip with the full text also appears on hover, as an extra.
- Inside a link, a tap or click navigates instead, so the page the link opens must show the full text.

A `title` attribute does not count: touch screens never show it.

## Components

**Composition over props.** Shared components are built from parts that each forward `className` and `ref`. Change behaviour by wrapping or swapping a part, not by adding a prop.

```tsx
<DataTable.Root rows={trades}>
  <DataTable.Column id="item" header="Item" cardRole="title" width={track.fr(2, vars.size.column.md)}>
    {(t) => <ItemLink item={t.item} />}
  </DataTable.Column>
  <DataTable.Column id="from" header="From" cardRole="field" width={track.fr(1)}>
    {(t) => <UserLink user={t.from} />}
  </DataTable.Column>
  <DataTable.Column id="actions" cardRole="actions" width={track.fixed(vars.size.column.sm)}>
    {(t) => <TradeActions trade={t} />}
  </DataTable.Column>
</DataTable.Root>
```

- **Variants** are recipes: `button({ tone: "danger", size: "sm" })`. Not boolean props passed through to styles.
- **Runtime values** go through `assignInlineVars`.

### Tables on phones

`DataTable` is a CSS grid, not a `<table>`. Each row is a grid; the root turns the columns' `width` tracks into one `grid-template-columns` that every row and the header share, so columns line up. Widths come from the [track helpers](#proportional-grids), and `track.content` is not allowed: each row sizes its own grid, so content-sized columns would differ row to row.

When its container is narrow, a container query gives each row card areas instead: `grid-template-areas` stacks the title, the fields and the actions, the header row is hidden, and each field cell shows its column name from `data-label` with `::before`. A column's `cardRole` places its cell: `title`, `field` (a label and value) or `actions`.

- The elements carry ARIA roles (`table`, `rowgroup`, `row`, `columnheader`, `cell`), so screen readers navigate it as a table.
- In card mode the header row is `display: none`, not visually hidden, and the `::before` label is the only label in the cell. A visually hidden header stays in the accessibility tree, so screen readers announce the column name from the header and again from the label.
- No second copy of the rows, ever. One set of DOM nodes, two layouts.
- `subgrid` would let content-sized columns line up across rows, but needs Chrome 117+, and the Playwright MCP browser is Chrome 108. Revisit if declared widths become a real limit.

Keep the table on phones when:

- it already fits at 360px (two or three short columns), or
- people compare values down a column, as in the item and currency ledgers. Those scroll sideways inside their container with the first column pinned (`position: sticky` on each row's first cell). The scroll container is keyboard-focusable (`tabIndex={0}`, `role="region"` and an `aria-label`) so it can be scrolled without a pointer, and sets `scroll-padding-inline-start` to the pinned column's width so focused cells never hide behind it.

## Loading

Pick the indicator by what is loading. Each follows the [no pop-in](#no-pop-in) rules: nothing around it moves when it appears or when the content replaces it.

| Situation | Indicator |
|---|---|
| First load of a page or section | A skeleton shaped like the content |
| Refetch, filter change or next page, with data on screen | Keep the data; show busy state on the control that caused it |
| An action: save, submit, delete | A spinner inside the button |
| Search and typeahead | A spinner in the input's end slot |
| A long task with known progress: uploads, character creation | A determinate progress bar with text |
| Background autosave | Status text in a fixed-width slot |
| Images | A `surface.sunken` placeholder at the image's aspect ratio |
| Navigating to another route | The current page stays; a thin progress bar runs along the top |

- **Skeletons** take the footprint of the content they stand in for, so the swap moves nothing. They appear at once, with no delay. Their shimmer is a decorative loop and stops under reduced motion.
- **Never replace content already on screen with a skeleton.** A refetch keeps the old data until the new data arrives. "Load more" shows busy state on its own button, and new rows appear below.
- **Buttons keep their size while busy.** The label stays in place but invisible, the spinner sits over it, and the button is disabled with `aria-busy`. Do not swap the label for "Saving…". Report the outcome with a toast or inline status.
- **Spinners** appear only inside controls: buttons and input end slots. A spinner centred in an empty section is not an option; that is what skeletons are for.
- **Known progress is shown as progress.** A task that can report how far along it is uses a determinate bar, never a spinner.
- **Route changes** keep the current page on screen until the next page's code and data are ready, with the top progress bar showing in the meantime.

### Timing

Every indicator except skeletons waits `timing.loader.delay` (500ms) before showing, so fast responses never flash one. Once shown, it stays at least `timing.loader.minVisible` (500ms), so it never blinks on and off. These are the values Android's `ContentLoadingProgressBar` uses for the same reason.

A button disables the moment it is pressed, before the delay runs, so a quick action still gets feedback and cannot be submitted twice.

### Startup

The `AppLoader` animation is the startup screen, and it lives in `index.html`, not in React, so it shows the moment the HTML arrives instead of after the JavaScript has downloaded.

- It is an element beside `<div id="root">`, not inside it. React never replaces it, so its animation runs without restarting while the code loads and while the app works out who is signed in and which community is being viewed.
- Its styles are inline CSS in `index.html`, with the few theme colours it needs repeated there for both themes. The theme script runs first, so it paints in the right theme. The lint rules do not cover `index.html`; keep these values in step with the theme by hand.
- It is exempt from the [loader timing](#timing): it fades in after 200ms, so a fast load never shows it, and has no minimum display time, so it never holds back a page that is ready.
- The app fades it out once sign-in and community checks have resolved and the first page has rendered. Route guards and redirects render nothing while it is showing.
- It covers the code download and the sign-in check, nothing more. The sign-in check stays under it because the shell depends on the answer: a shell skeleton shown before it could differ from the shell that follows.
- Page data is not its job. Once the first page renders, that page loads its data behind skeletons like any other, per [Loading](#loading). The startup screen never comes back after the first page.

## Interaction

- **Hover** styles go inside the shared hover condition, so they apply only on devices that hover. A bare `:hover` sticks after a tap on touch screens and is a lint error (`hover-in-hover-condition`). In a local style, `hover()` takes every hover selector the style needs and returns the contents of the `"@media"` key, so it spreads beside `mq()` entries: `"@media": { ...hover({ "&:hover:not(:disabled)": { background: vars.action.primary.bgHover } }), [mq("md")]: { … } }`. Call it once per style; a second spread replaces the first. Sprinkles take hover colours as a condition, which skips disabled controls: `sprinkles({ backgroundColor: { hover: "surface.raised" } })`.
- **Touch targets** follow WCAG 2.2's target size criteria. Aim for 44×44px; never go under 24×24px.
  - [2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), level AAA: at least 44×44px. Aim for this on touch devices, especially for primary actions and anything in a dense list.
  - [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), level AA: at least 24×24px. A smaller target passes only if a 24px circle centred on it does not overlap another target or its circle.
  - Both exempt a link inside a sentence, a control with an equivalent full-size control on the same page, browser-drawn controls, and a size that is essential to the information (a map pin).
  - The interactive primitives (`Button`, `IconButton`, menu items, list rows) meet 44×44px on touch devices. Build on them and the rule mostly takes care of itself; check by eye when you hand-build a control.
- **Tooltips** come in two kinds:
  - A tooltip that names an icon button repeats its accessible name. It shows on hover and focus, and on long-press on touch as a bonus; nothing depends on it.
  - Information people need goes in a toggletip: an info button that opens it on tap or click. Never put it in a hover-only tooltip.
- **Focus** uses the shared focus ring (`focusRing`) on `:focus-visible`. Never remove an outline without replacing it.
- **Links go somewhere; buttons do something.** Anything that takes people to a page is a real `<a href>`: a router `Link`, or `HostAwareLink` when the destination may be on another host. That keeps everything browsers do with links: Ctrl-click, Cmd-click, middle-click and Shift-click, "Open in new tab", "Copy link address", and the address shown on hover. Never send someone to a page from a button's `onClick` or with `navigate()` in a handler. Buttons are for actions: save, log out, switch theme.
  - This holds inside menus, cards and lists too. A menu item that navigates is a `MenuLinkItem` around the link.
  - A handler on a link, or on something around it, that does extra work on a click (closing a drawer, closing a menu) leaves modified and middle clicks alone, and never calls `preventDefault` on them.

## Accessibility

The baseline is [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA, plus the AAA criteria named here, within the precedence set at the top of this guide. These are the criteria styling decides. We do not currently face specific compliance requirements, so full 100% compliance is not the primary goal.

**Order**

- [1.3.2 Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html), [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html): reading and tab order follow the source. Change layout by changing the source order, not with `order`, `row-reverse` or grid placement that moves items out of source order. A visual reorder is acceptable when the reading and tab order still make sense, such as moving a decorative image above a heading on phones. Leave a comment saying why it is safe.

**Colour and contrast**

- [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): text 4.5:1, large text 3:1.
- [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): 3:1 for input borders, focus rings, icons, checkbox and toggle states, chart lines. The contrast test covers these pairs as well as text.
- [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): colour never carries meaning alone. A `status.*` colour always comes with an icon or text.

**Text**

- [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html): nothing breaks at 200% text, or when a user sets line height to 1.5, paragraph spacing to 2×, letter spacing to 0.12em and word spacing to 0.16em. No fixed heights on boxes that hold text. Text is clipped only through `Truncate`.

**Focus**

- [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) (AAA): the focus ring is at least as large as a 2px outline around the control and changes contrast by at least 3:1. The focus ring token is built to this.
- [2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): sticky headers, the drawer, toasts and pinned columns never fully hide the focused element.
  - The sticky header's height changes with text size, so the shell measures it with a `ResizeObserver` and sets it as a CSS variable. `scroll-padding-top` on the page uses that variable.
  - Toasts sit at the bottom of the screen below `md`, and top-right just under the sticky header on `md` and up, never over it.
  - Toasts cover the edge they sit on, so while any toast is showing, the shell measures the toast stack the same way and adds its height to `scroll-padding` on that edge: `scroll-padding-bottom` on phones, `scroll-padding-top` (on top of the header's) on `md` and up. Focus then scrolls into the part of the page the toasts leave clear.

**Pointer and touch**

- [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) and [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) Target Size: see [Interaction](#interaction).
- [2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html): everything done by dragging has a single-tap alternative: move up/down buttons, arrow keys or a "move to" menu for sorting; a zoom slider and nudge controls for the cropper and the candy board.
- [2.5.1 Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html): pinch, multi-finger and path gestures (swipe to dismiss, swipeable carousels) have a single-tap alternative, such as a close button or next and previous buttons.
- [2.5.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html): nothing completes on pointer down. A drag may start on `pointerdown`, but the action happens on release and can be abandoned by moving away or pressing Escape. Buttons and links use `click`.
- [1.3.4 Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html): never lock portrait or landscape.

**Hover, popovers and motion**

- [1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html): tooltips and popovers close on Escape, stay open while the pointer moves onto them, and stay until dismissed or no longer relevant.
- [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) (AAA): covered by the [motion tokens](#motion).

## Banned

Each is a lint error, from the rules in `packages/eslint-plugin-styles` (`@chardb/styles/<rule>`). They check `*.css.ts` files and the style helpers in `packages/ui/src/css`; the theme module is exempt from the literal-value rules.

| Banned | Rule |
|---|---|
| Literal colours outside the theme | `no-raw-color` |
| Literal lengths, including bare numbers in length properties | `no-raw-length` |
| Literal font families, sizes and weights | `no-raw-font` |
| Literal radii and shadows | `no-raw-radius-shadow` |
| Numeric `z-index` | `no-raw-z-index` |
| Literal durations and easings in transitions and animations | `no-raw-motion` |
| `infinite` outside `loop()` | `loop-via-helper` |
| Hand-written `@media` or `@container` conditions | `no-raw-media` |
| `:hover` outside the hover condition | `hover-in-hover-condition` |
| `!important` | `no-important` |
| `@chardb/ui` imported from a `*.css.ts` file | `no-restricted-imports` |
| `styled-components` in a file not on the allowlist | `no-styled-components` |

## Migrating a file

1. Create `Foo.css.ts` next to `Foo.tsx`.
2. Replace layout wrappers with primitives where one fits. Delete the styled wrapper.
3. Move what remains to `style()`, translating values to tokens. A value with no token is a question for the theme, not a literal.
4. Turn props that switched styles into recipe variants. Turn interpolated runtime values into `assignInlineVars`.
5. Build the phone layout first, then add `sm` and up.
6. Delete the styled-components import.

## Done for a page

- [ ] No styled-components left in the page or the components migrated with it
- [ ] Designed at 360px; no sideways scroll at 320px; checked at `md` and `lg`
- [ ] Every drag has a tap alternative
- [ ] Every interactive element is reachable by keyboard and touch and has an accessible name
- [ ] Both themes checked by eye
- [ ] `yarn lint:changed` passes

# Styling

How the frontend and `@chardb/ui` are styled. These conventions apply to every file written or migrated under the mobile work (#427). Files not yet migrated still use styled-components; leave them as they are unless you are migrating them.

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

- Add no new styled-components. When you migrate a file, convert all of it; a file is either styled-components or vanilla-extract.
- `style={{}}` is for values only known at runtime (a crop offset, a user-picked colour). Pass them as CSS variables with `assignInlineVars` so the stylesheet still owns the declaration.

## Tokens

Every colour, space, size, font family, font size, font weight, line height, radius, shadow, duration, easing and layer comes from the theme in `packages/ui/src/theme/`. A literal value in a `*.css.ts` file is a lint error (#468). Values that are not design decisions stay literal: `0`, percentages, `fr`, `auto`, keywords such as `none` or `inherit`, and unitless line heights.

Tokens are CSS custom properties. Light and dark themes set the same properties, switched by `data-theme` on `<html>`, so a theme change re-renders nothing.

- Each theme sets `color-scheme` (`light` or `dark`), so scrollbars, form controls and other browser-drawn parts follow it.
- An inline script in `index.html` sets `data-theme` from the saved preference, or from `prefers-color-scheme`, before the app's code loads. The page never paints in the wrong theme.

### Colour

Colours are named for what they do, never for what they look like. `text.muted`, not `grey500`.

Two tiers:

1. **Palette**: raw values. Private to the theme module; nothing else imports it.
2. **Semantic tokens**: what components use. Each maps to a palette value per theme.

Semantic families:

| Family | For |
|---|---|
| `surface.*` | Backgrounds of the page, cards, raised and sunken panels, overlays |
| `text.*` | Text and icons: default, muted, inverse, link |
| `border.*` | Dividers, input outlines, focus rings |
| `action.*` | Interactive controls: primary, secondary and danger, each with `bg`, `fg`, `border` and state variants |
| `status.*` | Success, warning, danger and info messages, each with `bg`, `fg` and `border` |

Every state or shade a component may use is its own token: `action.primary.bgHover`, `action.primary.bgPressed`, `action.primary.bgDisabled`, `status.danger.bgSubtle`. Components never lighten, darken, mix or add alpha themselves. If a shade you need is missing, add a token.

**Pairs.** The theme lists which foregrounds may sit on which backgrounds, and what each pair is for: body text, large text, or non-text (icons, borders, focus rings). `text.default` on `surface.raised` for body text is a pair; `text.muted` on `action.primary.bg` is not, unless the list says so. Use only listed pairs, and only for the use they are listed for. A pair listed for large text is not a body text pair.

**Contrast.** A unit test checks every listed pair in both themes against its use: 4.5:1 for body text, 3:1 for large text and non-text. The formula is the default, not the final word; a person looking at the pair decides borderline cases, in either direction. When a pair is approved despite failing the formula, put a one-line comment beside it in the theme with the ratio and why, so nobody reopens it, and mark it so the test skips it.

### Forced colours

Windows High Contrast and other forced-colour modes replace colours with system ones and remove `box-shadow`. Build so nothing disappears:

- The focus ring is an `outline`, never a `box-shadow` alone.
- Cards, inputs and other surfaces separated from their background only by colour also get a `1px solid transparent` border. Forced-colour mode draws it in a visible system colour.
- Icons use `currentColor`.

### Layers

`z-index` comes from the layer scale only:

| Token | Value | For |
|---|---|---|
| `layer.base` | 0 | Normal flow |
| `layer.sticky` | 1000 | Sticky headers, pinned table columns |
| `layer.dropdown` | 2000 | Menus, popovers, typeahead lists |
| `layer.overlay` | 3000 | Drawer backdrop, the navigation drawer |
| `layer.modal` | 4000 | Dialogs |
| `layer.toast` | 5000 | Toasts |

Each layer has `.100`, `.200` and `.300` steps (`layer.modal.100` is 4100) for stacking inside one layer, such as a popover opened from a dialog. They are an escape hatch: leave a comment saying why.

Elements opened with `<dialog>.showModal()` or the Popover API render in the browser's top layer, above every `z-index`. If dialogs use it, anything that must appear above an open dialog (a toast, a menu opened from inside it) must use the top layer too, or render inside the dialog.

### Motion

Durations and easings are tokens, for animation and transitions only. Under `prefers-reduced-motion: reduce`, the theme sets every duration token to `0.01ms`. Transitions still finish and `transitionend` still fires, so a drawer that unmounts when its transition ends keeps working. A literal `200ms` in a transition is a lint error.

- **Timers** (toast lifetime, tooltip delay, debounce) have their own `timing.*` tokens, which reduced motion leaves alone. Never time something with a duration token.
- **Loading indicators** use `motion.duration.essential`, which reduced motion slows but does not stop, so a spinner never looks frozen.
- **Smooth scrolling.** The theme sets `scroll-behavior: auto` under reduced motion. In code, call `scrollIntoView` and `scrollTo` through the shared helper, which picks `smooth` or `instant` from the preference.

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

- **Sprinkles** carry responsive values for common properties: `sprinkles({ flexDirection: { base: "column", md: "row" } })`.
- **`mq("md")`** builds the query for anything sprinkles does not cover. Never write a query string by hand; it is a lint error.
- **One source per property.** If sprinkles sets an element's `padding`, its local `style()` does not, and the reverse. Sprinkles and local styles live in different files, and which one wins depends on import order.
- `md` and `lg` do most structural work (sidebar becomes drawer, one column becomes two). `sm` refines. `xl` and `xxl` mostly cap content width.
- A layout that already adapts without a breakpoint (a wrapping row, an `auto-fit` grid) gets none.

### Container queries

A component that appears in slots of different widths (cards, panels, anything that may sit beside a sidebar) responds to its container, not the viewport.

```ts
export const panel = createContainer();

export const wrap = style({ containerName: panel, containerType: "inline-size" });

export const body = style({
  display: "block",
  "@container": cq(panel, "30rem", { display: "flex" }),
});
```

- `cq()` is to `@container` what `mq()` is to `@media`: the only way to write the condition.
- Thresholds belong to the component, chosen where its layout breaks, not borrowed from the viewport breakpoints.
- Thresholds are in `rem`. An `em` in a container query is measured against the container's own font size, so it shifts when that text is resized. Leave the root font size at the browser default, so `rem` follows the user's setting.

## Layout

Layout primitives in `@chardb/ui` own the flex and grid patterns the app repeats:

| Primitive | Does |
|---|---|
| `Stack` | Vertical flow with a gap |
| `Cluster` | Horizontal row that wraps: toolbars, tag lists, action bars |
| `Grid` | Columns that fit as many items as the width allows |
| `Switcher` | A row that becomes a column below a width |
| `Sidebar` | Two panes side by side that stack when narrow |

Reach for a primitive before writing `display: flex`. A one-off flex rule in a component is fine when no primitive fits; three of the same one-off is a missing primitive.

### Proportional grids

Column proportions come from `@chardb/ui`, not hand-written `grid-template-columns`.

**Ready-made splits** cover the common cases as classes: `split["1:1"]`, `split["2:1"]`, `split["1:2"]`, `split["1:1:1"]`, `split["3:1"]`. Each is a grid whose columns share the width in that ratio. Combine with `mq()` or a `Switcher` when the split should stack on phones.

**Track helpers** build anything else:

| Helper | Emits | For |
|---|---|---|
| `track.fr(2)` | `minmax(0, 2fr)` | A share of the remaining width |
| `track.fr(1, size.column.md)` | `minmax(<token>, 1fr)` | A share that never shrinks below a size |
| `track.fixed(size.column.sm)` | the token | A fixed-width column: dates, amounts, avatars |
| `track.content` | `max-content` | A column as wide as its content (not in `DataTable`) |

`track.fr` uses `minmax(0, …)` rather than a bare `fr` on purpose: a bare `1fr` cannot shrink below its content's width, so one long word can push the grid wider than its container.

### Shared styles

Shared `style()` fragments live in `packages/ui/src/styles/` for non-layout needs that recur: visually hidden text, the focus ring, card and interactive surfaces.

Share a style when two places **represent the same thing**, not when they **happen to look the same**. Ask: if I change one, will I wish I had changed the other, and would I have to remember to? If yes, share it, even between two components, when the link is that clear. If the match is coincidence, leave both alone; merging them couples things that will drift apart.

Repetition is the backstop: three copies of the same declarations means something is missing from the pool.

### Truncation

Truncating text is a design choice; use it on purpose, not to hide an overflow you did not plan for. Always truncate with `Truncate` from `@chardb/ui`, which makes the full text reachable:

- On devices that hover, a tooltip shows the full text on hover and on keyboard focus.
- On touch, tapping the text expands it in place.
- Inside a link, a tap navigates instead, so the page the link opens must show the full text.

A `title` attribute does not count: touch screens never show it.

## Components

**Composition over props.** Shared components are built from parts that each forward `className` and `ref`. Change behaviour by wrapping or swapping a part, not by adding a prop.

```tsx
<DataTable.Root rows={trades}>
  <DataTable.Column id="item" header="Item" cardRole="title" width={track.fr(2, size.column.md)}>
    {(t) => <ItemLink item={t.item} />}
  </DataTable.Column>
  <DataTable.Column id="from" header="From" cardRole="field" width={track.fr(1)}>
    {(t) => <UserLink user={t.from} />}
  </DataTable.Column>
  <DataTable.Column id="actions" cardRole="actions" width={track.fixed(size.column.sm)}>
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
- No second copy of the rows, ever. One set of DOM nodes, two layouts.
- `subgrid` would let content-sized columns line up across rows, but needs Chrome 117+, and the Playwright MCP browser is Chrome 108. Revisit if declared widths become a real limit.

Keep the table on phones when:

- it already fits at 360px (two or three short columns), or
- people compare values down a column, as in the item and currency ledgers. Those scroll sideways inside their container with the first column pinned (`position: sticky` on each row's first cell). The scroll container is keyboard-focusable (`tabIndex={0}`, `role="region"` and an `aria-label`) so it can be scrolled without a pointer, and sets `scroll-padding-inline-start` to the pinned column's width so focused cells never hide behind it.

## Interaction

- **Hover** styles go inside the shared hover condition, so they apply only on devices that hover. A bare `:hover` sticks after a tap on touch screens and is a lint error.
- **Touch targets** follow WCAG 2.2's target size criteria. Aim for 44×44px; never go under 24×24px.
  - [2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), level AAA: at least 44×44px. Aim for this on touch devices, especially for primary actions and anything in a dense list.
  - [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), level AA: at least 24×24px. A smaller target passes only if a 24px circle centred on it does not overlap another target or its circle.
  - Both exempt a link inside a sentence, a control with an equivalent full-size control on the same page, browser-drawn controls, and a size that is essential to the information (a map pin).
  - The interactive primitives (`Button`, `IconButton`, menu items, list rows) meet 44×44px on touch devices. Build on them and the rule mostly takes care of itself; check by eye when you hand-build a control.
- **Tooltips** come in two kinds:
  - A tooltip that names an icon button repeats its accessible name. It shows on hover and focus, and on long-press on touch as a bonus; nothing depends on it.
  - Information people need goes in a toggletip: an info button that opens it on tap or click. Never put it in a hover-only tooltip.
- **Focus** uses the shared focus ring on `:focus-visible`. Never remove an outline without replacing it.

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
  - Toasts sit top-right on `md` and up, and at the bottom of the screen below `md`, never over the header.

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

Each is a lint error once #468 lands.

- Literal colours, lengths, font families, font sizes, font weights, radii, shadows, `z-index` values, motion times and easings outside the theme
- Hand-written `@media` or `@container` strings
- `:hover` outside the hover condition
- `!important`
- New `styled-components` imports

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

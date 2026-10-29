# Styling

How the frontend and `@chardb/ui` are styled. These conventions apply to every file written or migrated under the mobile work (#427). Files not yet migrated still use styled-components; leave them as they are unless you are migrating them.

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

Every colour, space, size, font, radius, shadow, duration and layer comes from the theme in `packages/ui/src/theme/`. A literal value in a `*.css.ts` file is a lint error (#468).

Tokens are CSS custom properties. Light and dark themes set the same properties, switched by `data-theme` on `<html>`, so a theme change re-renders nothing.

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

**Pairs.** The theme lists which foregrounds may sit on which backgrounds. `text.default` on `surface.raised` is a pair; `text.muted` on `action.primary.bg` is not, unless the list says so. Use only listed pairs.

**Contrast.** A unit test checks every listed pair in both themes: 4.5:1 for body text, 3:1 for large text, icons and UI borders. WCAG's formula is the default, not the final word. When a pair sits at the borderline and the number disagrees with what a person sees, a human decides. Record the decision in the theme's contrast exceptions with the ratio, the reason and who reviewed it; the test reads that list.

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

Each layer has `-100`, `-200` and `-300` steps (`layer.modal-100` is 4100) for stacking inside one layer, such as a popover opened from a dialog. They are an escape hatch: leave a comment saying why.

### Motion

Durations and easings are tokens. Under `prefers-reduced-motion: reduce` the theme sets every duration token to `0ms`, so any transition built from tokens respects the setting with no per-component work. A literal `200ms` in a transition is a lint error.

## Breakpoints

Mobile-first. Base styles are the phone layout; conditions add layout as width grows. The narrowest supported width is 360px: nothing scrolls sideways there.

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

A component that appears in slots of different widths (cards, panels, anything that may sit beside a sidebar) responds to its container, not the viewport. Declare the container with `createContainer` and query it with the container helpers.

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

### Shared styles

Shared `style()` fragments live in `packages/ui/src/styles/` for non-layout needs that recur: visually hidden text, truncation, the focus ring, card and interactive surfaces.

Share a style when two places **represent the same thing**, not when they **happen to look the same**. Ask: if I change one, will I wish I had changed the other, and would I have to remember to? If yes, share it, even between two components, when the link is that clear. If the match is coincidence, leave both alone; merging them couples things that will drift apart.

Repetition is the backstop: three copies of the same declarations means something is missing from the pool.

## Components

**Composition over props.** Shared components are built from parts that each forward `className` and `ref`. Change behaviour by wrapping or swapping a part, not by adding a prop.

```tsx
<DataTable.Root rows={trades}>
  <DataTable.Column id="item" header="Item" cardRole="title">
    {(t) => <ItemLink item={t.item} />}
  </DataTable.Column>
  <DataTable.Column id="from" header="From" cardRole="field">
    {(t) => <UserLink user={t.from} />}
  </DataTable.Column>
  <DataTable.Column id="actions" cardRole="actions">
    {(t) => <TradeActions trade={t} />}
  </DataTable.Column>
</DataTable.Root>
```

- **Variants** are recipes: `button({ tone: "danger", size: "sm" })`. Not boolean props passed through to styles.
- **Runtime values** go through `assignInlineVars`.

### Tables on phones

`DataTable` renders a table and a card list from the same columns and shows one or the other with a container query. Cards are the default on narrow containers. A column's `cardRole` places it: `title`, `field` (a label and value) or `actions`.

Keep the table on phones when:

- it already fits at 360px (two or three short columns), or
- people compare values down a column, as in the item and currency ledgers. Those scroll sideways inside their container with the first column pinned.

## Interaction

- **Hover** styles go inside the shared hover condition, so they apply only on devices that hover. A bare `:hover` sticks after a tap on touch screens and is a lint error.
- **Touch targets** follow WCAG 2.2's target size criteria. Aim for 44×44px; never go under 24×24px.
  - [2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), level AAA: at least 44×44px. Aim for this on touch devices, especially for primary actions and anything in a dense list.
  - [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), level AA: at least 24×24px. A smaller target passes only if a 24px circle centred on it does not overlap another target or its circle.
  - Both exempt a link inside a sentence, a control with an equivalent full-size control on the same page, browser-drawn controls, and a size that is essential to the information (a map pin).
  - The interactive primitives (`Button`, `IconButton`, menu items, list rows) meet 44×44px on touch devices. Build on them and the rule mostly takes care of itself; check by eye when you hand-build a control.
- **Hover-only information** needs another way in. Tooltips open on long-press on touch devices. Anything users need to act on is visible without hovering.
- **Focus** uses the shared focus ring on `:focus-visible`. Never remove an outline without replacing it.

## Banned

Each is a lint error once #468 lands.

- Literal colours, lengths, `z-index` values and motion times outside the theme
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
- [ ] Usable at 360px with no sideways scroll; checked at `md` and `lg`
- [ ] Every interactive element reachable and labelled by keyboard and touch
- [ ] Both themes checked by eye
- [ ] `yarn lint:changed` passes

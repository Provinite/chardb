# @chardb/ui

Before writing or changing any style, component, token or primitive in this package, read [apps/frontend/STYLING.md](../../apps/frontend/STYLING.md) in full. Its rules apply here without exception.

This package owns the theme, the breakpoints, the layout primitives and the shared style fragments. Every page builds on them, so a mistake here spreads everywhere:

- A new token, colour pair, layer or breakpoint changes the contract every page relies on. Add one only when the guidance calls for it, and update STYLING.md in the same change.
- Primitives and shared components compose from parts that forward `className` and `ref`. Add a part, not a prop.
- Interactive primitives meet the target size, focus and contrast criteria in STYLING.md, because pages inherit them instead of checking them.

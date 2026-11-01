# UI Package Changelog

All notable changes to the UI package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`size.achievement` token** for an achievement's picture.

## [v15.1.0] - 2026-11-01

### Added

- **`IconButton`**, named by a required `label`, plus **`ButtonLink`**, **`Spinner`**, `useLoaderVisible`, `touchQuery` and the `size.spinner` and `action.primary.fgOutline` tokens (#503).
- **Overlays opened in a `Dialog` render in its layer**: menus, popovers, tooltips, toggletips and typeahead lists; dialogs leave `data-inert-exempt` (`INERT_EXEMPT`) elements interactive (#499).

### Changed

- **Breaking: `Button` is on vanilla-extract**: `variant` is `tone`, `loading` is `busy` (spinner after the loader delay, label kept), `lg`, `as`, `to` and `href` are gone, and every size is a 44px target on touch; `Dialog` takes `data-testid` (#503).
- **`Dialog` has a close button and no longer closes on a scrim click** unless it passes `closeOnScrimClick`, as `CommandPalette` does; `closeDisabled` blocks closing while busy (#499).
- **Typeaheads search after `timing.debounce.typeahead` (200ms)**, not 300ms, and their lists share `AnchoredList` (#499).

## [v15.0.0] - 2026-10-31

### Added

- **`useDebouncedValue`**, **`Dialog.Body`**, and a `wide` `Dialog` with the `size.dialogWide` token, for what Mantine supplied (#466).

- **`Tooltip`**, a name shown on hover, keyboard focus and long press, and **`Toggletip`**, a note behind an info button that screen readers hear as it opens; plus the `timing.tooltip` tokens and the `illustration.lamp` colours (#466).

- **`Popover`**, a panel beside its button that keeps keyboard order as if it sat right after it, and **`useAnchoredPosition`**, which places it and `Menu` with floating-ui's `fallbackPlacements` and `fallbackStrategy`, slides it to stay on screen, and caps it to the room it has (#466).
- **`Dialog`**, a modal `<dialog>` on the modal layer that makes the rest of the page inert, and **`CommandPalette`**, a search box over a fixed-height listbox inside one; plus the `size.dialog` and `size.dialogList` tokens (#466).
- **`TopProgressBar`**: the indeterminate bar along the top of the viewport for route changes, announced once to screen readers each time it appears (#465, #487).
- **`MenuLinkItem`**: a menu item that is the caller's own link, so Ctrl-click, middle-click and "open in new tab" work on it (#486).
- **`Menu` `appearance="ghost"`**: a borderless trigger at the 44px touch size, for a trigger with content of its own such as an avatar (#486).
- **`useBreakpoint`**: whether the viewport is at least a breakpoint wide, known on the first render; and the `size.sidebar` token (#486).
- **Layout primitives** `Stack`, `Cluster`, `Grid`, `Switcher` and `Sidebar`, and the `focusRing`, `visuallyHidden`, `cardSurface` and `interactiveSurface` style fragments (#475).
- **Style helpers** from `@chardb/ui/theme`: `mq`, `hover`, `cq`, `track`, `split`, `sprinkles` and `loop`, plus `scrollToElement` and `scrollToPosition` that respect reduced motion (#474).
- **vanilla-extract theme**: semantic tokens as `vars` for light and dark, with reduced-motion durations and a contrast test for every listed colour pair (#473).
- **`Menu`**, with `MenuGroup` and `MenuItem`: a "⋯" button that opens a keyboard-navigable list of actions in labelled groups (#430).
- **`SearchSelect`**, with `CharacterTypeahead` and `ItemTypeTypeahead` on top: a search box that picks one option; the caller fetches the options, so it works with any query.
- **`Avatar`**: a user's picture as a circle, or their initials when there is
  none, falling back to initials when the image fails to load.

### Changed

- **The focus ring is a listed pair on every status tint** (`status.*.bgSubtle`), so the contrast test covers controls inside tinted toasts and alerts (#484).
- **`scrollToPosition()` takes `jump: true`** to skip the animation for everyone, for scrolls that reset rather than move (#484).
- **`loop()` returns a style rule instead of a class**, so the vanilla-extract runtime no longer ships in every bundle that imports `@chardb/ui`; `style([loop(...), {...}])` works unchanged (#465).

### Removed

- Unused Storybook 7 dependencies and scripts; the package had no Storybook config or stories (#463).

### Fixed

- `UserTypeahead`'s debounced search no longer leaves a pending search to fire
  after unmount.

## [v3.0.0] - 2025-10-19

### Added

- **UserTypeahead Component**: Reusable user search and selection component with autocomplete
  - Debounced search input (300ms) with configurable minimum character requirement
  - Keyboard navigation support (Arrow keys, Enter, Escape)
  - Avatar display with fallback to initial letter for users without avatars
  - Visual user selection showing username and displayName
  - Single-select mode with clear selection button
  - Loading states and empty state messaging
  - Error state support with visual feedback
  - Dropdown positioning with max-height scrolling
  - Accessibility features with proper ARIA labels and focus management
  - Theme integration for consistent styling

## [v2.0.0] - 2025-09-01

### Added

#### Core Component Library Expansion

- **Card Component Family**: Reusable card components for consistent surface styling
  - `Card` component with hover effects, clickable variants, and theme integration
  - `CardHeader` component for consistent card header layouts
  - `CardTitle` component with proper typography and spacing
  - `CardContent` component for card body content with padding controls
  - Support for onClick handlers and accessibility features
- **Modal Component**: Accessible modal dialog system
  - Overlay and backdrop click handling for dismissal
  - Focus management and keyboard navigation (Escape to close)
  - Portal rendering for proper z-index stacking
  - Flexible sizing and positioning options
- **Input Component**: Enhanced form input with comprehensive features
  - Error state styling and validation feedback integration
  - React ref forwarding for react-hook-form compatibility
  - Transient props pattern (`$hasError`) to prevent DOM attribute warnings
  - Loading state indicators and disabled state styling
- **Typography Component System**: Consistent text styling across applications
  - Heading components (H1, H2, H3, H4, H5, H6) with proper hierarchy
  - `Text` component for body content with size and weight variants
  - `Caption` component for small descriptive text
  - Full theme integration with color and spacing consistency
- **ErrorMessage Component**: Standardized error display component
  - Consistent error styling with theme color integration
  - Icon support for visual error indication
  - Accessibility features with proper ARIA labels
  - Flexible content support for strings and React elements

### Changed

#### Component Improvements

- **Button Component Enhancement**: Expanded button functionality and styling
  - Improved variant system with consistent theming
  - Enhanced size options (sm, md, lg) with proper spacing
  - Loading state support with spinner integration
  - Better focus management and accessibility features
  - Fixed styled-components prop warnings with transient props pattern

#### Theme Integration

- **Color System Extension**: Enhanced theme colors for new components
  - Added surface color for card and modal backgrounds
  - Improved border color consistency across components
  - Enhanced error and success color definitions
- **Component Index Updates**: Improved component exports and organization
  - Updated index.ts with all new component exports
  - Better tree-shaking support for individual component imports
  - Consistent naming conventions across all components

### Technical Improvements

#### Developer Experience

- **TypeScript Interface Standards**: Consistent prop interfaces across all components
  - Comprehensive prop documentation with JSDoc comments
  - Proper default prop handling and optional parameter patterns
  - Enhanced IntelliSense support for component usage
- **Styled-Components Best Practices**: Implementation of transient props pattern
  - Elimination of DOM attribute warnings for style-related props
  - Improved performance with proper prop filtering
  - Consistent theme integration across all styled components
- **Accessibility Improvements**: Enhanced ARIA support and keyboard navigation
  - Proper focus management in interactive components
  - Screen reader compatibility with semantic HTML structure
  - Keyboard navigation support for all interactive elements

#### Performance Optimizations

- **Component Size Optimization**: Efficient component implementations
  - Minimal re-renders with proper prop dependency management
  - Optimized styled-components with theme caching
  - Tree-shakable component exports for reduced bundle size

## [v0.2.0] - 2025-01-12

### Added

- TagInput component with typeahead functionality
- Tag chip component with remove buttons
- Real-time tag search integration
- Keyboard navigation support
- Visual chip design with theme integration

### Fixed

- Styled-components DOM prop warnings
- Tag input focus management
- Form integration compatibility

## [v0.1.0] - 2025-01-11

### Added

- Tag component with multiple variants
- TagsContainer component for consistent layouts
- Size variants (sm, md) for different contexts
- Hover effects and accessibility features
- Theme integration and custom color support

## [v0.0.1] - 2025-08-10

### Added

- Initial UI package setup
- Basic component infrastructure
- Theme system foundation
- TypeScript configuration
- Component export system
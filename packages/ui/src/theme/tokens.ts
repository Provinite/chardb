import { palette as p } from "./palette";

/**
 * Token values as plain objects. contract.css.ts turns their shape into CSS
 * custom properties and theme.css.ts assigns these values to them; the
 * contrast test reads them directly.
 */

const actionStates = (
  bg: string,
  bgHover: string,
  bgPressed: string,
  bgSubtle: string,
  bgDisabled: string,
) => ({
  bg,
  bgHover,
  bgPressed,
  bgSubtle,
  bgDisabled,
  fg: p.white,
  fgDisabled: p.white,
  border: bg,
});

const statusColors = (bg: string, bgSubtle: string, border: string) => ({
  bg,
  bgSubtle,
  fg: bg,
  border,
});

/**
 * Colours of things drawn rather than of the interface: the same in both
 * themes, because a lamp is yellow by day and by night. No text sits on
 * them, so they have no pairs.
 */
const illustration = {
  /** The light over the candy board, as its control draws it. */
  lamp: {
    fill: p.amber200,
    edge: p.amber700,
    /** Where a spotlight lands. */
    pool: p.amber200Faint,
    poolEdge: p.amber200Strong,
  },
};

/**
 * Colours of a seasonal event's own corner of the interface, such as the
 * Halloween links in the sidebar: the same in both themes, because the
 * event looks like itself by day and by night.
 */
const event = {
  halloween: {
    /** Night sky, behind the event's heading. */
    bg: p.violet950,
    /** Pumpkin: the heading's text. */
    fg: p.orange400,
    /** Candlelight: the heading's icon and the rule under it. */
    accent: p.orange300,
  },
};

export const lightColors = {
  illustration,
  event,
  surface: {
    page: p.white,
    raised: p.slate50,
    /** A raised surface under the pointer. */
    raisedHover: p.slate100,
    sunken: p.slate100,
    overlay: p.scrim,
  },
  text: {
    default: p.slate800,
    muted: p.slate600,
    subtle: p.slate550,
    /** Text on a filled status background. */
    inverse: p.white,
    link: p.violet600,
    linkHover: p.violet700,
  },
  border: {
    default: p.slate200,
    input: p.slate500,
    focus: p.violet500,
  },
  action: {
    primary: {
      ...actionStates(
        p.violet600,
        p.violet700,
        p.violet800,
        p.violet50,
        p.slate400,
      ),
      /** An outline button's label, on the surface around it. */
      fgOutline: p.violet600,
    },
    secondary: actionStates(
      p.emerald700,
      p.emerald800,
      p.emerald900,
      p.emerald50,
      p.slate400,
    ),
    danger: actionStates(p.red600, p.red700, p.red800, p.red50, p.slate400),
  },
  status: {
    success: statusColors(p.emerald700, p.emerald50, p.emerald200),
    warning: statusColors(p.amber700, p.amber50, p.amber200),
    danger: statusColors(p.red700, p.red50, p.red200),
    info: statusColors(p.cyan700, p.cyan50, p.cyan200),
  },
};

export type ColorTokens = typeof lightColors;

export const darkColors: ColorTokens = {
  illustration,
  event,
  surface: {
    page: p.slate900,
    raised: p.slate800,
    raisedHover: p.slate750,
    sunken: p.slate950,
    overlay: p.scrim,
  },
  text: {
    default: p.slate100,
    muted: p.slate300,
    subtle: p.slate400,
    // Dark text, because the dark theme's status fills are light.
    inverse: p.slate900,
    link: p.violet400,
    linkHover: p.violet300,
  },
  border: {
    default: p.slate700,
    input: p.slate500,
    focus: p.violet500,
  },
  action: {
    primary: {
      ...actionStates(
        p.violet600,
        p.violet700,
        p.violet800,
        p.violet950,
        p.slate500,
      ),
      // Lighter than the fill: violet600 is too dark to read on dark surfaces.
      fgOutline: p.violet400,
    },
    secondary: actionStates(
      p.green700,
      p.green800,
      p.green900,
      p.green950,
      p.slate500,
    ),
    danger: actionStates(p.red600, p.red700, p.red800, p.red950, p.slate500),
  },
  status: {
    success: statusColors(p.green500, p.green950, p.green800),
    warning: statusColors(p.amber400, p.amber950, p.amber800),
    danger: statusColors(p.red400, p.red950, p.red800),
    info: statusColors(p.cyan400, p.cyan950, p.cyan800),
  },
};

const layerGroup = (base: number) => ({
  base: String(base),
  100: String(base + 100),
  200: String(base + 200),
  300: String(base + 300),
});

/** Timer lengths in milliseconds, for JavaScript. Reduced motion leaves them alone. */
export const timingMs = {
  loader: {
    delay: 500,
    minVisible: 500,
  },
  debounce: {
    /** A list of picks updating as you type: under the point where it lags the box. */
    typeahead: 200,
    /** A search box over a page of results, each search a round trip. */
    search: 300,
  },
  tooltip: {
    /** Hovering this long shows it; passing over on the way elsewhere does not. */
    delay: 400,
    /** Grace after the pointer leaves, so it can cross onto the tooltip. */
    hideDelay: 100,
    /** Holding a touch this long shows it, as the bonus on touch screens. */
    longPress: 500,
  },
};

/** Tokens that are the same in both themes. */
export const sharedTokens = {
  space: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    xxl: "3rem",
  },
  size: {
    /** Grid tracks, for `track.fixed` and the minimum of `track.fr`. */
    column: {
      xs: "4rem",
      sm: "6rem",
      md: "10rem",
      lg: "14rem",
      xl: "20rem",
      /** The narrowest a character card gets. */
      card: "18.75rem",
    },
    /** The widest a dialog gets. Narrower screens give it their full width. */
    dialog: "36rem",
    /** For a dialog with columns or a grid in it: a picker, a form side by side. */
    dialogWide: "48rem",
    /**
     * The height a dialog's result list holds at whatever it shows, so the
     * dialog never resizes as results come and go. Shorter screens shrink it.
     */
    dialogList: "28rem",
    /** The gap between a control and its focus ring. */
    focusOffset: "2px",
    /** A spinner inside a control: as tall as the control's text. */
    spinner: "1em",
    /** The navigation sidebar's width, beside the page and as a drawer. */
    sidebar: "17.5rem",
    target: {
      /** The 24px floor no control goes under. */
      min: "1.5rem",
      /** The 44px size touch controls aim for. */
      comfortable: "2.75rem",
    },
  },
  borderWidth: {
    hairline: "1px",
    thick: "2px",
    focus: "2px",
  },
  font: {
    family: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'Monaco, Consolas, "Courier New", monospace',
    },
    size: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      xxl: "1.5rem",
    },
    weight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeight: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  layer: {
    page: layerGroup(0),
    sticky: layerGroup(1000),
    dropdown: layerGroup(2000),
    overlay: layerGroup(3000),
    modal: layerGroup(4000),
    toast: layerGroup(5000),
  },
  motion: {
    duration: {
      fast: "150ms",
      normal: "200ms",
      slow: "300ms",
      /** One cycle of a loop that shows something is happening, such as a spinner. */
      essential: "1s",
    },
    easing: {
      standard: "ease-in-out",
      enter: "ease-out",
      exit: "ease-in",
      linear: "linear",
    },
  },
  timing: {
    loader: {
      delay: `${timingMs.loader.delay}ms`,
      minVisible: `${timingMs.loader.minVisible}ms`,
    },
    debounce: {
      typeahead: `${timingMs.debounce.typeahead}ms`,
      search: `${timingMs.debounce.search}ms`,
    },
    tooltip: {
      delay: `${timingMs.tooltip.delay}ms`,
      hideDelay: `${timingMs.tooltip.hideDelay}ms`,
      longPress: `${timingMs.tooltip.longPress}ms`,
    },
  },
};

/**
 * Durations under `prefers-reduced-motion: reduce`. Short enough to look
 * instant while `transitionend` and `animationend` still fire; the essential
 * loop slows instead, so a spinner never looks frozen.
 */
export const reducedMotionDurations: typeof sharedTokens.motion.duration = {
  fast: "0.01ms",
  normal: "0.01ms",
  slow: "0.01ms",
  essential: "2s",
};

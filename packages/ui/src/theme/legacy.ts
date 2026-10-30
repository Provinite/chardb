import { palette as p } from "./palette";
import { sharedTokens } from "./tokens";

/**
 * The styled-components theme. Same shape and values as before the
 * vanilla-extract theme, read from the same palette so a colour changes in
 * one place. Removed once the last styled-component is migrated.
 */
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    danger: string;
    dangerHover: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export const lightTheme: Theme = {
  colors: {
    primary: p.violet500,
    secondary: p.emerald600,
    background: p.white,
    surface: p.slate50,
    text: {
      primary: p.slate800,
      secondary: p.slate600,
      muted: p.slate400,
    },
    border: p.slate200,
    error: p.red500,
    warning: p.amber500,
    success: p.emerald500,
    info: p.cyan500,
    danger: p.red600,
    dangerHover: p.red700,
  },
  // Copies, so changing this theme in place cannot change the tokens.
  spacing: { ...sharedTokens.space },
  typography: {
    fontFamily: sharedTokens.font.family.body,
    fontSize: { ...sharedTokens.font.size },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  borderRadius: { ...sharedTokens.radius },
  shadows: { ...sharedTokens.shadow },
};

export const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: p.violet500,
    secondary: p.green500,
    background: p.slate900,
    surface: p.slate800,
    text: {
      primary: p.slate100,
      secondary: p.slate300,
      muted: p.slate500,
    },
    border: p.slate700,
    error: p.red400,
    warning: p.amber400,
    success: p.green500,
    info: p.cyan400,
    danger: p.red400,
    dangerHover: p.red500,
  },
};

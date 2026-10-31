import React from "react";
import { Tooltip as MantineTooltip } from "@mantine/core";
import { useTheme } from "styled-components";
import { vars } from "@chardb/ui/theme";

interface CustomTooltipProps {
  label: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<CustomTooltipProps> = ({
  label,
  children,
  position = "top",
}) => {
  const theme = useTheme();

  return (
    <MantineTooltip
      label={label}
      position={position}
      withArrow
      // Above popovers, which some of these sit in: Mantine's own default is
      // under the dropdown layer. Goes with this file when Tooltip is ours.
      zIndex={vars.layer.dropdown[100]}
      styles={{
        tooltip: {
          backgroundColor: theme.colors.surface,
          color: theme.colors.text.primary,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.md,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          boxShadow: theme.shadows.lg,
          border: `1px solid ${theme.colors.border}`,
        },
        arrow: {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      }}
    >
      {children}
    </MantineTooltip>
  );
};

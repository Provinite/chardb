import React from 'react';
import { Tooltip as ReactTooltip, TooltipProps } from 'react-tooltip';
import { useTheme } from 'styled-components';

interface CustomTooltipProps extends Omit<TooltipProps, 'style'> {
  id: string;
}

export const Tooltip: React.FC<CustomTooltipProps> = ({ id, ...props }) => {
  const theme = useTheme();

  return (
    <ReactTooltip
      id={id}
      place="top"
      arrowSize={8}
      style={{
        backgroundColor: theme.colors.surface,
        color: theme.colors.text.primary,
        borderRadius: theme.borderRadius.md,
        fontSize: theme.typography.fontSize.md,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        boxShadow: theme.shadows.lg,
        border: `1px solid ${theme.colors.border}`,
        zIndex: 1000,
      }}
      {...props}
    />
  );
};
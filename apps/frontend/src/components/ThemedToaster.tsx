import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

export const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Toaster 
      position="top-right"
      gutter={12}
      containerStyle={{
        top: 20,
        right: 20,
        zIndex: 1000000,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: theme.colors.surface,
          color: theme.colors.text.primary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          fontSize: theme.typography.fontSize.sm,
          fontFamily: theme.typography.fontFamily,
          boxShadow: theme.shadows.lg,
          minWidth: '300px',
          maxWidth: '500px',
          wordBreak: 'break-word',
        },
        success: {
          duration: 3500,
          style: {
            background: theme.colors.surface,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.success}`,
            borderRadius: theme.borderRadius.lg,
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            fontSize: theme.typography.fontSize.sm,
            fontFamily: theme.typography.fontFamily,
            boxShadow: `0 4px 12px ${theme.colors.success}30, ${theme.shadows.lg}`,
            minWidth: '300px',
            maxWidth: '500px',
            wordBreak: 'break-word',
          },
          iconTheme: {
            primary: theme.colors.success,
            secondary: theme.colors.background,
          },
        },
        error: {
          duration: 6000,
          style: {
            background: theme.colors.surface,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.error}`,
            borderRadius: theme.borderRadius.lg,
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            fontSize: theme.typography.fontSize.sm,
            fontFamily: theme.typography.fontFamily,
            boxShadow: `0 4px 12px ${theme.colors.error}30, ${theme.shadows.lg}`,
            minWidth: '300px',
            maxWidth: '500px',
            wordBreak: 'break-word',
          },
          iconTheme: {
            primary: theme.colors.error,
            secondary: theme.colors.background,
          },
        },
      }}
    />
  );
};
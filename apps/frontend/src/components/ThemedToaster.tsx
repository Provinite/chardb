import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
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
          position: 'relative',
          paddingRight: '48px',
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
            position: 'relative',
            paddingRight: '48px',
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
            position: 'relative',
            paddingRight: '48px',
          },
          iconTheme: {
            primary: theme.colors.error,
            secondary: theme.colors.background,
          },
        },
      }}
    >
      {(t) => (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1 }}>
            {typeof t.message === 'function' ? t.message(t) : t.message}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: theme.colors.text.secondary,
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: '1',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.border;
            }}
            onMouseOut={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </Toaster>
  );
};
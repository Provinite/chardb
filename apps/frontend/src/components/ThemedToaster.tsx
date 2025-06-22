import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

export const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();

  const getToastStyles = (t: any) => {
    const baseStyles = {
      background: theme.colors.surface,
      color: theme.colors.text.primary,
      borderRadius: theme.borderRadius.lg,
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      paddingRight: '48px',
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily,
      boxShadow: theme.shadows.lg,
      minWidth: '300px',
      maxWidth: '500px',
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      // Animation properties
      transform: t.visible ? 'translateX(0)' : 'translateX(100%)',
      opacity: t.visible ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    switch (t.type) {
      case 'success':
        return {
          ...baseStyles,
          border: `1px solid ${theme.colors.success}`,
          boxShadow: `0 4px 12px ${theme.colors.success}30, ${theme.shadows.lg}`,
        };
      case 'error':
        return {
          ...baseStyles,
          border: `1px solid ${theme.colors.error}`,
          boxShadow: `0 4px 12px ${theme.colors.error}30, ${theme.shadows.lg}`,
        };
      default:
        return {
          ...baseStyles,
          border: `1px solid ${theme.colors.border}`,
        };
    }
  };

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
        success: { duration: 3500 },
        error: { duration: 6000 },
      }}
    >
      {(t) => (
        <div style={getToastStyles(t)}>
          <div style={{ flex: 1 }}>
            {typeof t.message === 'function' ? t.message(t) : t.message}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: theme.colors.text.secondary,
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              lineHeight: '1',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = theme.colors.border;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
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
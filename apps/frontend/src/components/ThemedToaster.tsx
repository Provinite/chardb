import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

// Higher z-index to ensure toasts appear above all content
const TOAST_Z_INDEX = 1000000;

const ToastContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: ${TOAST_Z_INDEX};
`;

const ToastBackdrop = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(1px);
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease;
  z-index: ${TOAST_Z_INDEX - 1};
`;

const StyledToaster = styled(Toaster)`
  /* Override default toast positioning */
  .go3958317564 {
    z-index: ${TOAST_Z_INDEX + 1} !important;
  }
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: ${({ theme }) => theme.spacing.sm};
  pointer-events: auto;
`;

const ToastMessage = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.4;
`;

const ToastIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  opacity: 0.6;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`;

// Track active toasts to show backdrop for critical ones
let activeToasts = new Set<string>();
let hasBackdropToast = false;

export const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();
  const [showBackdrop, setShowBackdrop] = React.useState(false);

  React.useEffect(() => {
    // Update backdrop visibility based on critical toasts
    setShowBackdrop(hasBackdropToast);
  }, []);

  const getToastStyle = (type: 'default' | 'success' | 'error' | 'loading') => {
    const baseStyle = {
      background: theme.colors.surface,
      color: theme.colors.text.primary,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily,
      boxShadow: theme.shadows.lg,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      position: 'relative' as const,
      minWidth: '300px',
      maxWidth: '500px',
      wordBreak: 'break-word' as const,
      zIndex: TOAST_Z_INDEX + 2,
    };

    // Add type-specific styling
    switch (type) {
      case 'success':
        return {
          ...baseStyle,
          borderColor: theme.colors.success,
          background: `${theme.colors.success}10`,
          boxShadow: `0 4px 12px ${theme.colors.success}20, ${theme.shadows.lg}`,
        };
      case 'error':
        return {
          ...baseStyle,
          borderColor: theme.colors.error,
          background: `${theme.colors.error}10`,
          boxShadow: `0 4px 12px ${theme.colors.error}20, ${theme.shadows.lg}`,
        };
      case 'loading':
        return {
          ...baseStyle,
          borderColor: theme.colors.info,
          background: `${theme.colors.info}10`,
          boxShadow: `0 4px 12px ${theme.colors.info}20, ${theme.shadows.lg}`,
        };
      default:
        return baseStyle;
    }
  };

  const getIconTheme = (type: 'success' | 'error' | 'loading') => {
    switch (type) {
      case 'success':
        return {
          primary: theme.colors.success,
          secondary: theme.colors.background,
        };
      case 'error':
        return {
          primary: theme.colors.error,
          secondary: theme.colors.background,
        };
      case 'loading':
        return {
          primary: theme.colors.info,
          secondary: theme.colors.background,
        };
    }
  };

  const renderToast = (t: any) => {
    return (
      <ToastContent>
        <ToastMessage>
          {t.icon && <ToastIcon>{t.icon}</ToastIcon>}
          {typeof t.message === 'function' ? t.message(t) : t.message}
        </ToastMessage>
        <DismissButton
          onClick={() => {
            toast.dismiss(t.id);
            activeToasts.delete(t.id);
            if (activeToasts.size === 0) {
              hasBackdropToast = false;
              setShowBackdrop(false);
            }
          }}
          aria-label="Dismiss notification"
        >
          ×
        </DismissButton>
      </ToastContent>
    );
  };

  return (
    <>
      <ToastBackdrop $visible={showBackdrop} />
      <ToastContainer>
        <StyledToaster
          position="top-right"
          gutter={12}
          containerStyle={{
            top: 20,
            right: 20,
            left: 20,
            zIndex: TOAST_Z_INDEX + 1,
          }}
          toastOptions={{
            duration: 4000,
            style: getToastStyle('default'),
            success: {
              duration: 3500,
              style: getToastStyle('success'),
              iconTheme: getIconTheme('success'),
            },
            error: {
              duration: 6000,
              style: getToastStyle('error'),
              iconTheme: getIconTheme('error'),
            },
            loading: {
              duration: Infinity,
              style: getToastStyle('loading'),
              iconTheme: getIconTheme('loading'),
            },
          }}
        >
          {renderToast}
        </StyledToaster>
      </ToastContainer>
    </>
  );
};

// Enhanced toast API with backdrop support for critical notifications
export const criticalToast = {
  success: (message: string) => {
    const id = toast.success(message);
    activeToasts.add(id);
    hasBackdropToast = true;
    return id;
  },
  error: (message: string) => {
    const id = toast.error(message);
    activeToasts.add(id);
    hasBackdropToast = true;
    return id;
  },
  loading: (message: string) => {
    const id = toast.loading(message);
    activeToasts.add(id);
    hasBackdropToast = true;
    return id;
  },
  dismiss: (id?: string) => {
    if (id) {
      activeToasts.delete(id);
    } else {
      activeToasts.clear();
    }
    if (activeToasts.size === 0) {
      hasBackdropToast = false;
    }
    return toast.dismiss(id);
  },
};
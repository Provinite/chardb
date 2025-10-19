import React from 'react';
import { MantineProvider } from '@mantine/core';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedMantineProviderProps {
  children: React.ReactNode;
}

export const ThemedMantineProvider: React.FC<ThemedMantineProviderProps> = ({
  children,
}) => {
  const { mode } = useTheme();

  return <MantineProvider forceColorScheme={mode}>{children}</MantineProvider>;
};

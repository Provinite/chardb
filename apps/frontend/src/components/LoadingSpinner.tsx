import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div<{ size: string }>`
  width: ${({ size }) => {
    switch (size) {
      case 'sm':
        return '1rem';
      case 'lg':
        return '3rem';
      default:
        return '2rem';
    }
  }};
  height: ${({ size }) => {
    switch (size) {
      case 'sm':
        return '1rem';
      case 'lg':
        return '3rem';
      default:
        return '2rem';
    }
  }};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
}) => {
  return <SpinnerContainer size={size} />;
};

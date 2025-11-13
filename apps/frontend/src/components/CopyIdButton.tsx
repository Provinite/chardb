import React from 'react';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Button = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

interface CopyIdButtonProps {
  id: string;
  label?: string;
  onCopy?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Button that copies an ID to clipboard. Only visible to admins.
 */
export const CopyIdButton: React.FC<CopyIdButtonProps> = ({
  id,
  label = '📋',
  onCopy,
  onClick,
  className,
}) => {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success('ID copied to clipboard');
    onCopy?.();
    onClick?.(e);
  };

  return (
    <Button onClick={handleClick} title="Copy ID" className={className}>
      {label}
    </Button>
  );
};

import React from 'react';
import styled from 'styled-components';
import { Button } from '@chardb/ui';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
}

const Overlay = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen'
})<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Dialog = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  min-width: 400px;
  max-width: 500px;
  width: 100%;
  
  @media (max-width: 768px) {
    min-width: unset;
    margin: ${({ theme }) => theme.spacing.lg};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Icon = styled.div`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.error};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Message = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

const ItemName = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isLoading = false,
}) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <Overlay isOpen={isOpen} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <Dialog role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <Header>
          <Icon>⚠️</Icon>
          <Title id="dialog-title">{title}</Title>
        </Header>
        
        <Message id="dialog-message">
          {message}
          {itemName && (
            <>
              {' '}
              <ItemName>"{itemName}"</ItemName>
            </>
          )}
        </Message>

        <ButtonGroup>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onConfirm}
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </ButtonGroup>
      </Dialog>
    </Overlay>
  );
};
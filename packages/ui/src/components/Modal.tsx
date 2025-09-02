import React from 'react';
import styled from 'styled-components';

/**
 * Full-screen overlay that dims the background content
 */
const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

/**
 * The modal content container with theme-based styling
 */
const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

/**
 * Optional modal header with consistent typography
 */
const ModalHeader = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

/**
 * Props for the Modal component
 */
interface ModalProps {
  /** Whether the modal is currently open/visible */
  isOpen: boolean;
  /** Callback function called when the modal should be closed */
  onClose: () => void;
  /** Optional title displayed at the top of the modal */
  title?: string;
  /** The content to display inside the modal */
  children: React.ReactNode;
}

/**
 * Modal - A reusable modal dialog component with overlay and theme integration
 * 
 * Provides a centered modal dialog with a semi-transparent overlay. The modal can be
 * closed by clicking outside the content area. Supports optional title and custom content.
 * Uses theme colors and spacing for consistent styling across the application.
 * 
 * Features:
 * - Fixed positioning with high z-index (1000)
 * - Click-outside-to-close functionality
 * - Responsive sizing (90% width, max 500px)
 * - Scrollable content when needed (max-height 80vh)
 * - Theme-based styling and shadows
 * 
 * @example
 * ```tsx
 * // Basic modal with title
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to proceed?</p>
 *   <button onClick={() => setIsOpen(false)}>Cancel</button>
 *   <button onClick={handleConfirm}>Confirm</button>
 * </Modal>
 * 
 * // Form modal without title
 * <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
 *   <form onSubmit={handleSubmit}>
 *     <input type="text" placeholder="Name" />
 *     <button type="submit">Save</button>
 *   </form>
 * </Modal>
 * 
 * // Complex content modal
 * <Modal 
 *   isOpen={showDetails} 
 *   onClose={() => setShowDetails(false)}
 *   title="User Details"
 * >
 *   <UserProfile user={selectedUser} />
 *   <div style={{ marginTop: '1rem' }}>
 *     <Button onClick={handleEdit}>Edit</Button>
 *     <Button variant="secondary" onClick={() => setShowDetails(false)}>
 *       Close
 *     </Button>
 *   </div>
 * </Modal>
 * ```
 * 
 * @param props - The component props
 * @param props.isOpen - Whether the modal is currently visible
 * @param props.onClose - Function called when the modal should be closed
 * @param props.title - Optional title displayed at the top of the modal
 * @param props.children - The content to display inside the modal
 * @returns A modal dialog component
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  /**
   * Handle clicks on the overlay (outside the modal content)
   * Closes the modal when clicking outside the content area
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent>
        {title && <ModalHeader>{title}</ModalHeader>}
        {children}
      </ModalContent>
    </ModalOverlay>
  );
}
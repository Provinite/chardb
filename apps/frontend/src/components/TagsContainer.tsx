import React from 'react';
import styled from 'styled-components';

const Container = styled.div<{ size?: 'sm' | 'md' }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme, size = 'md' }) =>
    size === 'sm' ? theme.spacing.xs : theme.spacing.sm};
`;

export interface TagsContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export const TagsContainer: React.FC<TagsContainerProps> = ({
  children,
  size = 'md',
  className,
  style,
}) => {
  return (
    <Container size={size} className={className} style={style}>
      {children}
    </Container>
  );
};

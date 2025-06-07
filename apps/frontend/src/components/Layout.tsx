import React from 'react';
import styled from 'styled-components';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem 0;
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LayoutContainer>
      <Header />
      <Main>
        {children}
      </Main>
      <Footer />
    </LayoutContainer>
  );
};
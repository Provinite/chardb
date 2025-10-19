import React from 'react';
import styled from 'styled-components';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommunityNavigationSidebar } from './navigation/CommunityNavigationSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  position: relative;
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem 0;
  min-width: 0; /* Prevents flex item from overflowing */
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LayoutContainer>
      <Header />
      <ContentWrapper>
        <CommunityNavigationSidebar />
        <Main>
          {children}
        </Main>
      </ContentWrapper>
      <Footer />
    </LayoutContainer>
  );
};
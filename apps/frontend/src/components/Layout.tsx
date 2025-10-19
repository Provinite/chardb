import React from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommunityNavigationSidebar } from './navigation/CommunityNavigationSidebar';
import { GlobalNavigationSidebar } from './navigation/GlobalNavigationSidebar';

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

/**
 * Checks if the current route is a community-scoped route
 */
const isCommunityRoute = (pathname: string): boolean => {
  const communityRoutes = [
    /^\/communities\/[^/]+/,
    /^\/species\/[^/]+/,
    /^\/character\/[^/]+/,
  ];
  return communityRoutes.some((pattern) => pattern.test(pathname));
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const showCommunitySidebar = isCommunityRoute(location.pathname);

  return (
    <LayoutContainer>
      <Header />
      <ContentWrapper>
        {showCommunitySidebar ? <CommunityNavigationSidebar /> : <GlobalNavigationSidebar />}
        <Main>
          {children}
        </Main>
      </ContentWrapper>
      <Footer />
    </LayoutContainer>
  );
};
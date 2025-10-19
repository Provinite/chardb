import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommunityNavigationSidebar } from './navigation/CommunityNavigationSidebar';
import { GlobalNavigationSidebar } from './navigation/GlobalNavigationSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

type SidebarPreference = 'auto' | 'global' | 'community';

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
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>('auto');

  const isCommunityScopedRoute = isCommunityRoute(location.pathname);

  // Determine which sidebar to show based on preference and route
  const showCommunitySidebar =
    sidebarPreference === 'community' ? true :
    sidebarPreference === 'global' ? false :
    isCommunityScopedRoute; // auto mode - use route detection

  // Reset preference to auto when navigating to a different route type
  React.useEffect(() => {
    setSidebarPreference('auto');
  }, [location.pathname]);

  const handleToggleSidebar = (preference: 'global' | 'community') => {
    setSidebarPreference(preference);
  };

  return (
    <LayoutContainer>
      <Header />
      <ContentWrapper>
        {showCommunitySidebar ? (
          <CommunityNavigationSidebar
            onToggleToGlobal={() => handleToggleSidebar('global')}
          />
        ) : (
          <GlobalNavigationSidebar
            onToggleToCommunity={isCommunityScopedRoute ? () => handleToggleSidebar('community') : undefined}
          />
        )}
        <Main>
          {children}
        </Main>
      </ContentWrapper>
      <Footer />
    </LayoutContainer>
  );
};
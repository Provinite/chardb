import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CommunityNavigationSidebar } from "./navigation/CommunityNavigationSidebar";
import { GlobalNavigationSidebar } from "./navigation/GlobalNavigationSidebar";
import { useCommunityHost } from "../contexts/CommunityHostContext";

interface LayoutProps {
  children: React.ReactNode;
}

type SidebarPreference = "auto" | "global" | "community";

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
  const location = useLocation();
  const [sidebarPreference, setSidebarPreference] =
    useState<SidebarPreference>("auto");

  // Which sidebar belongs here is now a property of the host, not the path.
  // It used to be `isCommunityRoute(location.pathname)` against six patterns,
  // kept in sync by hand with a second copy in the sidebar itself (#293); the
  // hostname answers the same question without either.
  const { community } = useCommunityHost();
  const isCommunityScopedRoute = community !== null;

  // Determine which sidebar to show based on preference and route
  const showCommunitySidebar =
    sidebarPreference === "community"
      ? true
      : sidebarPreference === "global"
        ? false
        : isCommunityScopedRoute; // auto mode - use route detection

  // Reset preference to auto when navigating to a different route type
  React.useEffect(() => {
    setSidebarPreference("auto");
  }, [location.pathname]);

  const handleToggleSidebar = (preference: "global" | "community") => {
    setSidebarPreference(preference);
  };

  return (
    <LayoutContainer>
      <Header />
      <ContentWrapper>
        {showCommunitySidebar ? (
          <CommunityNavigationSidebar
            onToggleToGlobal={() => handleToggleSidebar("global")}
          />
        ) : (
          <GlobalNavigationSidebar
            onToggleToCommunity={
              isCommunityScopedRoute
                ? () => handleToggleSidebar("community")
                : undefined
            }
          />
        )}
        <Main>{children}</Main>
      </ContentWrapper>
      <Footer />
    </LayoutContainer>
  );
};

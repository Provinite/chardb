import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useBreakpoint } from "@chardb/ui";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CommunityNavigationSidebar } from "./navigation/CommunityNavigationSidebar";
import { GlobalNavigationSidebar } from "./navigation/GlobalNavigationSidebar";
import { NavigationDrawer } from "./navigation/NavigationDrawer";
import { useCommunityHost } from "../contexts/CommunityHostContext";
import { useDismissBootScreen } from "../hooks/useBootScreen";
import * as styles from "./Layout.css";

interface LayoutProps {
  children: React.ReactNode;
}

type SidebarPreference = "auto" | "global" | "community";

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  useDismissBootScreen();
  const location = useLocation();
  const [sidebarPreference, setSidebarPreference] =
    useState<SidebarPreference>("auto");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarIsColumn = useBreakpoint("md");
  const headerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

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

  // Reset preference to auto when navigating to a different route type, and
  // close the drawer: following one of its links is done with it.
  useEffect(() => {
    setSidebarPreference("auto");
    setDrawerOpen(false);
  }, [location.pathname]);

  // From `md` the sidebar is a column again, and an open drawer would leave
  // the page inert with nothing on screen to close it.
  useEffect(() => {
    if (sidebarIsColumn) setDrawerOpen(false);
  }, [sidebarIsColumn]);

  // The one place that decides whether the drawer is modal: open, and below
  // `md`. The drawer's dialog role and the inert page both follow it.
  const drawerModal = drawerOpen && !sidebarIsColumn;

  // A modal drawer makes the rest of the page inert: focus and screen readers
  // stay inside it. Set by hand because React 18 does not know the attribute.
  // A layout effect, so the header is live again before the drawer's own
  // effect hands focus back to the menu button in it.
  useLayoutEffect(() => {
    const regions = [headerRef, mainRef, footerRef];
    for (const region of regions) {
      region.current?.toggleAttribute("inert", drawerModal);
    }
  }, [drawerModal]);

  const handleToggleSidebar = (preference: "global" | "community") => {
    setSidebarPreference(preference);
  };

  return (
    <div className={styles.layout}>
      <Header
        ref={headerRef}
        navigationOpen={drawerModal}
        onOpenNavigation={() => setDrawerOpen(true)}
      />
      <div className={styles.body}>
        <NavigationDrawer
          open={drawerModal}
          onClose={() => setDrawerOpen(false)}
        >
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
        </NavigationDrawer>
        <main ref={mainRef} className={styles.main}>
          {children}
        </main>
      </div>
      <Footer ref={footerRef} />
    </div>
  );
};

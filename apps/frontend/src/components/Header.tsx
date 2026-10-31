import { forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu as MenuIcon } from "lucide-react";
import { Cluster } from "@chardb/ui";
import { useAuth } from "../contexts/AuthContext";
import { useCommunityHost } from "../contexts/CommunityHostContext";
import { useTheme } from "../contexts/ThemeContext";
import { AccountMenu } from "./AccountMenu";
import { HostAwareLink } from "./HostAwareLink";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./notifications/NotificationBell";
import * as styles from "./Header.css";

interface HeaderProps {
  /** Whether the navigation drawer is open, for the menu button's state. */
  navigationOpen: boolean;
  onOpenNavigation: () => void;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  { navigationOpen, onOpenNavigation },
  ref,
) {
  const { user, logout } = useAuth();
  const { slug: communitySlug } = useCommunityHost();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Your profile on the host you are on: a community host shows you as a
  // member of it, the apex shows the site-wide profile.
  const profileTo = user
    ? communitySlug
      ? `/members/${user.username}`
      : `/user/${user.username}`
    : "";

  return (
    <header ref={ref} className={styles.header}>
      <Cluster justify="space-between" gap="xs" className={styles.row}>
        <Cluster gap="xs">
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Open navigation"
            aria-expanded={navigationOpen}
            onClick={onOpenNavigation}
          >
            <MenuIcon size={24} aria-hidden />
          </button>
          <Link to="/" className={styles.logo}>
            CharDB
          </Link>
        </Cluster>

        <Cluster gap="xs">
          {user && (
            <>
              {/* A character is created in a community, so this only exists on
                  a community host. At the apex there is no community to create
                  it in and no route to offer. */}
              {communitySlug && (
                <HostAwareLink
                  to="/character/create"
                  className={styles.navLink}
                >
                  Create Character
                </HostAwareLink>
              )}
              {/* Relative, so uploading stays on whichever host you clicked
                  it from. The media is still yours rather than the
                  community's, but the host decides which moderators review it
                  -- leaving for the apex first would throw that away. */}
              <HostAwareLink to="/upload" className={styles.navLink}>
                Upload
              </HostAwareLink>
            </>
          )}
          {/* Signed out, nothing else needs the room, so the toggle stays at
              every width; signed in, the account menu carries it below sm. */}
          {user ? (
            <span className={styles.roomyOnly}>
              <ThemeToggle />
            </span>
          ) : (
            <ThemeToggle />
          )}
          {user && <NotificationBell />}
          <AccountMenu
            user={user}
            themeMode={mode}
            canCreateCharacter={Boolean(communitySlug)}
            profileTo={profileTo}
            onLogout={handleLogout}
            onToggleTheme={toggleTheme}
          />
        </Cluster>
      </Cluster>
    </header>
  );
});

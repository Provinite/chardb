import React from "react";
import { UserRound } from "lucide-react";
import { Avatar, Menu, MenuItem, useBreakpoint } from "@chardb/ui";
import { apexUrl, loginUrlReturningHere } from "../lib/communityHost";
import * as styles from "./AccountMenu.css";

interface AccountUser {
  username: string;
  displayName?: string | null;
  avatarImage?: React.ComponentProps<typeof Avatar>["image"];
}

export interface AccountMenuProps {
  /** The signed-in viewer, or `null` when nobody is signed in. */
  user: AccountUser | null;
  themeMode: "light" | "dark";
  /** Whether this host has a community to create a character in. */
  canCreateCharacter: boolean;
  /** Goes to a path or an absolute URL on any of this site's hosts. */
  onNavigate: (to: string) => void;
  onLogout: () => void;
  onToggleTheme: () => void;
}

/**
 * The avatar menu at the end of the header. Below `sm` it also carries the
 * header controls that no longer fit in the row. Which items it holds is
 * decided in render rather than hidden with CSS, because the menu's arrow
 * keys would still step onto a hidden item.
 */
export const AccountMenu: React.FC<AccountMenuProps> = ({
  user,
  themeMode,
  canCreateCharacter,
  onNavigate,
  onLogout,
  onToggleTheme,
}) => {
  const roomInHeader = useBreakpoint("sm");

  if (!user) {
    return (
      <Menu
        label="Log in or sign up"
        appearance="ghost"
        testId="account-menu"
        trigger={
          <>
            <UserRound size={24} aria-hidden />
            <span className={styles.name}>Log in</span>
          </>
        }
      >
        <MenuItem onSelect={() => onNavigate(loginUrlReturningHere())}>
          Log in
        </MenuItem>
        <MenuItem onSelect={() => onNavigate("/signup")}>Sign up</MenuItem>
      </Menu>
    );
  }

  const shownName = user.displayName || user.username;

  return (
    <Menu
      label={`${shownName}, account menu`}
      appearance="ghost"
      testId="account-menu"
      trigger={
        <>
          <Avatar image={user.avatarImage} name={shownName} size={32} />
          <span className={styles.name}>{shownName}</span>
        </>
      }
    >
      <MenuItem onSelect={() => onNavigate(apexUrl(`/user/${user.username}`))}>
        My profile
      </MenuItem>
      {!roomInHeader && (
        <>
          {canCreateCharacter && (
            <MenuItem onSelect={() => onNavigate("/character/create")}>
              Create Character
            </MenuItem>
          )}
          <MenuItem onSelect={() => onNavigate("/upload")}>Upload</MenuItem>
          <MenuItem onSelect={onToggleTheme}>
            {themeMode === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"}
          </MenuItem>
        </>
      )}
      <MenuItem onSelect={onLogout}>Log out</MenuItem>
    </Menu>
  );
};

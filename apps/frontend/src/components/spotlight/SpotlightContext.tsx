import React, { createContext, useContext, useMemo, useState } from "react";
import { spotlight } from "@mantine/spotlight";
import { SpotlightNavigation } from "./SpotlightNavigation";
import { PaletteNavigation } from "./PaletteNavigation";
import { readSpotlightImpl } from "./spotlightImpl";

interface SpotlightControls {
  open: () => void;
}

const SpotlightContext = createContext<SpotlightControls | null>(null);

/** Opens the page search, from the sidebars' search buttons. */
export function useSpotlight(): SpotlightControls {
  const controls = useContext(SpotlightContext);
  if (!controls) throw new Error("useSpotlight used outside SpotlightProvider");
  return controls;
}

/**
 * Mounts the page search and lets the rest of the app open it.
 *
 * Replaces Mantine's global `spotlight` store, which only its own Spotlight
 * can listen to.
 */
export const SpotlightProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [impl] = useState(readSpotlightImpl);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const controls = useMemo<SpotlightControls>(
    () => ({
      open: impl === "mantine" ? spotlight.open : () => setPaletteOpen(true),
    }),
    [impl],
  );

  return (
    <SpotlightContext.Provider value={controls}>
      {impl === "mantine" ? (
        <SpotlightNavigation />
      ) : (
        <PaletteNavigation open={paletteOpen} onOpenChange={setPaletteOpen} />
      )}
      {children}
    </SpotlightContext.Provider>
  );
};

import React, { createContext, useContext, useMemo, useState } from "react";
import { PaletteNavigation } from "./PaletteNavigation";

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

/** Mounts the page search and lets the rest of the app open it. */
export const SpotlightProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const controls = useMemo<SpotlightControls>(
    () => ({ open: () => setOpen(true) }),
    [],
  );

  return (
    <SpotlightContext.Provider value={controls}>
      <PaletteNavigation open={open} onOpenChange={setOpen} />
      {children}
    </SpotlightContext.Provider>
  );
};

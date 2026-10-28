/**
 * The trick-or-treat title ribbon the nameplate is drawn on. The nameplate is
 * an SVG shown as a picture, and such a picture loads nothing from outside
 * itself, so the ribbon is fetched once and kept as a data address to put
 * inside it.
 */
import { useEffect, useState } from "react";

export const RIBBON_SRC = "/halloween/tot-title-ribbon.png";

/** The ribbon, once it has been loaded. */
let ribbon: string | null = null;
let loading: Promise<string | null> | null = null;

/** A PNG's bytes as a data address. */
function asDataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/png;base64,${btoa(binary)}`;
}

async function fetchRibbon(): Promise<string | null> {
  try {
    const response = await fetch(RIBBON_SRC);
    if (!response.ok) throw new Error("The ribbon did not load");
    ribbon = asDataUrl(new Uint8Array(await response.arrayBuffer()));
    return ribbon;
  } catch {
    // Tried again next time it is wanted.
    loading = null;
    return null;
  }
}

/** The ribbon as a data address; nothing if it will not load. */
export function loadRibbon(): Promise<string | null> {
  loading ??= fetchRibbon();
  return loading;
}

/** The ribbon as a data address, once it has loaded. */
export function useRibbon(): string | null {
  const [loaded, setLoaded] = useState(ribbon);
  useEffect(() => {
    if (loaded) return;
    let current = true;
    void loadRibbon().then((src) => {
      if (current) setLoaded(src);
    });
    return () => {
      current = false;
    };
  }, [loaded]);
  return loaded;
}

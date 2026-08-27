import communityBasic from "./community-basic.js";
import type { PresetDef } from "../types.js";

/**
 * The preset registry. Adding a preset is: write the file, add one line here.
 * See apps/e2e/README.md for the walkthrough.
 */
export const PRESETS = {
  "community-basic": communityBasic,
} as const satisfies Record<string, PresetDef<any>>;

export type PresetName = keyof typeof PRESETS;

export type PresetHandle<K extends PresetName> =
  (typeof PRESETS)[K] extends PresetDef<infer H> ? H : never;

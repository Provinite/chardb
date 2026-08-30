import communityBasic from "./community-basic.js";
import communityItems from "./community-items.js";
import type { PresetDef } from "../types.js";

/**
 * The preset registry. Adding a preset is: write the file, add one line here.
 * See apps/e2e/README.md for the walkthrough.
 */
export const PRESETS = {
  "community-basic": communityBasic,
  "community-items": communityItems,
} as const satisfies Record<string, PresetDef<unknown>>;

export type PresetName = keyof typeof PRESETS;

/** Union of every preset's handle -- what a spec sees when the preset is not
 *  statically known (e.g. through the Playwright `world` fixture). */
export type AnyPresetHandle = {
  [K in PresetName]: PresetHandle<K>;
}[PresetName];

export type PresetHandle<K extends PresetName> =
  (typeof PRESETS)[K] extends PresetDef<infer H> ? H : never;

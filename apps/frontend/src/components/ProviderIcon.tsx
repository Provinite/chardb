import React from "react";
import styled from "styled-components";
import { ExternalAccountProvider } from "../generated/graphql";
import { Tooltip } from "./Tooltip";
import toyhouseIcon from "../assets/providers/toyhouse.png";

/**
 * Brand marks for the account-linking providers, each on its brand colour.
 *
 * Sources, since none of these is ours to redraw:
 * - Discord: the Symbol from discord.com/branding, on Blurple.
 * - Patreon: the symbol as published by Simple Icons (CC0), which traces
 *   Patreon's own; patreon.com/brand refuses non-browser downloads.
 * - DeviantArt: the Simple Icons mark, coloured as in DeviantArt's app icon.
 *   DeviantArt publishes no brand kit.
 * - Toyhouse: the house mark from the toyhou.se homepage (`/img/cover-400.png`,
 *   a one-colour cutout), filled white and set on the site's own charcoal as
 *   the homepage shows it. No brand kit exists, and no vector version.
 */
interface ProviderMark {
  label: string;
  background: string;
  glyph: React.ReactNode;
}

const svg = (viewBox: string, path: string, fill: string): React.ReactNode => (
  <svg viewBox={viewBox} width="62%" height="62%" aria-hidden="true">
    <path d={path} fill={fill} />
  </svg>
);

const MARKS: Record<ExternalAccountProvider, ProviderMark> = {
  [ExternalAccountProvider.Discord]: {
    label: "Discord",
    background: "#5865F2",
    glyph: svg(
      "0 0 64 48",
      "M40.575 0C39.9562 1.09866 39.4006 2.2352 38.8954 3.397C34.0967 2.67719 29.2096 2.67719 24.3982 3.397C23.9057 2.2352 23.3374 1.09866 22.7186 0C18.2104 0.770324 13.8157 2.12155 9.64839 4.02841C1.38951 16.2652 -0.845688 28.1863 0.265599 39.9432C5.10222 43.517 10.5197 46.2447 16.2909 47.9874C17.5916 46.2447 18.7407 44.3883 19.7257 42.4562C17.8568 41.7616 16.0509 40.8903 14.3208 39.88C14.7755 39.5517 15.2175 39.2107 15.6468 38.8824C25.7873 43.6559 37.5316 43.6559 47.6847 38.8824C48.1141 39.236 48.5561 39.577 49.0107 39.88C47.2806 40.9029 45.4748 41.7616 43.5931 42.4688C44.5781 44.4009 45.7273 46.2573 47.028 48C52.7991 46.2573 58.2167 43.5422 63.0533 39.9684C64.3666 26.3299 60.8055 14.5099 53.6452 4.04104C49.4905 2.13418 45.0959 0.782952 40.5876 0.0252565L40.575 0ZM21.1401 32.7072C18.0209 32.7072 15.4321 29.8785 15.4321 26.3804C15.4321 22.8824 17.9199 20.041 21.1275 20.041C24.3351 20.041 26.886 22.895 26.8354 26.3804C26.7849 29.8658 24.3224 32.7072 21.1401 32.7072ZM42.1788 32.7072C39.047 32.7072 36.4834 29.8785 36.4834 26.3804C36.4834 22.8824 38.9712 20.041 42.1788 20.041C45.3864 20.041 47.9246 22.895 47.8741 26.3804C47.8236 29.8658 45.3611 32.7072 42.1788 32.7072Z",
      "#FFFFFF",
    ),
  },
  [ExternalAccountProvider.Patreon]: {
    label: "Patreon",
    background: "#000000",
    glyph: svg(
      "0 0 24 24",
      "M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z",
      "#FFFFFF",
    ),
  },
  [ExternalAccountProvider.Deviantart]: {
    label: "DeviantArt",
    background: "#06070D",
    glyph: svg(
      "0 0 24 24",
      "M19.207 4.794l.23-.43V0H15.07l-.436.44-2.058 3.925-.646.436H4.58v5.993h4.04l.36.436-4.175 7.98-.24.43V24H8.93l.436-.44 2.07-3.925.644-.436h7.35v-5.993h-4.05l-.36-.438 4.186-7.977z",
      "#05CC47",
    ),
  },
  [ExternalAccountProvider.Toyhouse]: {
    label: "Toyhouse",
    background: "#333333",
    glyph: <img src={toyhouseIcon} alt="" width="62%" height="62%" />,
  },
};

const Tile = styled.span<{ $size: number; $background: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ $size }) => Math.round($size / 4)}px;
  background: ${({ $background }) => $background};
  overflow: hidden;
`;

interface ProviderIconProps {
  provider: ExternalAccountProvider;
  /** Edge length in px. */
  size?: number;
  /** Off where the provider is already named next to the icon, e.g. a "Link Discord" button. */
  withTooltip?: boolean;
}

/** A provider's brand mark, named by tooltip and to assistive tech. */
export const ProviderIcon: React.FC<ProviderIconProps> = ({
  provider,
  size = 40,
  withTooltip = true,
}) => {
  const mark = MARKS[provider];
  const tile = (
    <Tile
      $size={size}
      $background={mark.background}
      role="img"
      aria-label={mark.label}
    >
      {mark.glyph}
    </Tile>
  );
  return withTooltip ? <Tooltip label={mark.label}>{tile}</Tooltip> : tile;
};

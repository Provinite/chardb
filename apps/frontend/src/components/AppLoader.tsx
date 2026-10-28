import React, { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { darkTheme } from "@chardb/ui";

/**
 * How long a load has to take before the loader shows at all. Anything faster
 * goes straight from blank to the page, which reads as instant; flashing the
 * loader for a few frames reads as a stutter.
 */
export const APP_LOADER_DELAY_MS = 200;

// The glint that sweeps across the wordmark: a lighter step of the primary
// violet. On the dark background it can go nearly white; on the light one
// that would read as the letters vanishing rather than shining.
const GLINT_ON_DARK = "#ede9fe";
const GLINT_ON_LIGHT = "#c4b5fd";

const sweep = keyframes`
  0% { background-position: 100% 0; }
  70%, 100% { background-position: 0% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

const Container = styled.div<{ $fullscreen: boolean; $visible: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${({ $fullscreen }) => ($fullscreen ? "100vh" : "50vh")};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.3s ease;
`;

const Wordmark = styled.span`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.primary};
  user-select: none;

  @media (prefers-reduced-motion: no-preference) {
    ${({ theme }) => css`
      background-image: linear-gradient(
        100deg,
        ${theme.colors.primary} 44%,
        ${theme === darkTheme ? GLINT_ON_DARK : GLINT_ON_LIGHT} 50%,
        ${theme.colors.primary} 56%
      );
      background-size: 250% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: ${sweep} 1.8s ease-in-out infinite;
    `}
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

interface AppLoaderProps {
  /**
   * Fill the whole viewport. Off when the loader renders inside the layout,
   * below the header, where a full viewport height would overflow.
   */
  fullscreen?: boolean;
}

/**
 * The loading state for a whole page: the CharDB wordmark with a glint
 * sweeping across it.
 */
export const AppLoader: React.FC<AppLoaderProps> = ({ fullscreen = false }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), APP_LOADER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Container
      role="status"
      data-visible={visible}
      $fullscreen={fullscreen}
      $visible={visible}
    >
      <Wordmark aria-hidden="true">CharDB</Wordmark>
      <span className="sr-only">Loading</span>
    </Container>
  );
};

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToPosition } from "@chardb/ui";

export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollToPosition({ top: 0, left: 0, jump: true });
  }, [pathname]);

  return null;
};

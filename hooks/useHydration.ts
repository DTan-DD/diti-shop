/* eslint-disable react-hooks/set-state-in-effect */
// hooks/useHydration.ts
import { useEffect, useState } from "react";

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";

function useDeviceType() {
  // ✅ FIX 1: Mặc định "mobile" để phù hợp với mobile-first
  // Hoặc return null trong lần render đầu
  const [deviceType, setDeviceType] = useState<"mobile" | "desktop" | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleResize = () => {
      setDeviceType(window.innerWidth <= 768 ? "mobile" : "desktop");
    };

    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ FIX 2: Return null nếu chưa mount để tránh hydration mismatch
  if (!isMounted) {
    return null;
  }

  return deviceType;
}

export default useDeviceType;

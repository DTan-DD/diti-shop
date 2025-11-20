"use client";

import useCartSidebar from "@/hooks/use-cart-sidebar";
import useCartStore from "@/hooks/use-cart-store";
import useDeviceType from "@/hooks/use-device-type";
import { ReactNode } from "react";

export default function DynamicHeaderWrapper({ children }: { children: ReactNode }) {
  const {
    cart: { items },
  } = useCartStore();
  const deviceType = useDeviceType();
  const visible = useCartSidebar();

  // Tính toán right offset dựa trên device và số items
  const getRightOffset = () => {
    if (!deviceType) return "136px"; // Default fallback

    if (deviceType === "mobile") {
      return "0px"; // Mobile không cần offset
    }

    // Desktop: điều chỉnh dựa trên số lượng items
    if (items.length > 0 && visible) {
      return "136px";
    } else {
      return "0px";
    }
  };

  return (
    <header className="bg-black text-white fixed top-0 left-0 z-10" style={{ right: getRightOffset() }}>
      {children}
    </header>
  );
}

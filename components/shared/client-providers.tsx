// components/providers/client-providers-fixed.tsx
"use client";
import React from "react";
import useCartSidebar from "@/hooks/use-cart-sidebar";
import { Toaster } from "../ui/sonner";
import { ThemeProvider } from "./theme-provider";
import AppInitializer from "./app-initializer";
import { ClientSetting } from "@/types";
import CartSidebar from "./cart-sidebar";

export default function ClientProvidersFixed({ setting, children }: { setting: ClientSetting; children: React.ReactNode }) {
  const visible = useCartSidebar();

  // QUAN TRỌNG: Luôn giữ layout structure ổn định
  return (
    <AppInitializer setting={setting}>
      <ThemeProvider attribute="class" defaultTheme={setting?.common?.defaultTheme?.toLowerCase() || "light"}>
        {/* Layout cố định, không thay đổi structure */}
        <div className={`min-h-screen ${visible ? "flex" : "block"}`}>
          <div className={visible ? "flex-1 overflow-hidden" : "w-full"}>{children}</div>
          {/* {visible && <CartSidebar />} */}
          <CartSidebar visible={visible} />
        </div>
        <Toaster />
      </ThemeProvider>
    </AppInitializer>
  );
}

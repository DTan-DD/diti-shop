/* eslint-disable react-hooks/exhaustive-deps */
// 📂 components/cart/cart-provider.tsx
// ⚠️ CRITICAL FIX - Giải quyết race condition

"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import useCartStore from "@/hooks/use-cart-store";
import { useToast } from "@/hooks/use-toast";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const { initializeCart, setAuthState, mergeGuestCartOnLogin, _hasHydrated } = useCartStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string | null>(null);

  // ✅ FIX: Sử dụng ref để track initialization
  const isInitializing = useRef(false);

  useEffect(() => {
    // ✅ FIX 1: Đợi cả session và zustand hydrate
    if (status === "loading" || !_hasHydrated) {
      // console.log("⏳ Waiting for hydration...", { status, _hasHydrated });
      return;
    }

    // ✅ FIX 2: Tránh double initialization
    if (isInitializing.current) {
      // console.log("⏭️ Initialization already in progress");
      return;
    }

    const userId = session?.user?.id;
    const isLoggedIn = !!userId;

    // ============================================
    // CASE 1: Initial Load
    // ============================================
    if (!isInitialized) {
      // console.log("🚀 CartProvider: Initial load", { isLoggedIn, userId });

      isInitializing.current = true;

      setAuthState(isLoggedIn, userId || null);

      initializeCart(userId)
        .then(() => {
          // console.log("✅ Cart initialized");
          setIsInitialized(true);
          setPrevUserId(userId || null);
        })
        .catch((error) => {
          console.error("❌ Init failed:", error);
          setIsInitialized(true);
          setPrevUserId(userId || null);
        })
        .finally(() => {
          isInitializing.current = false;
        });

      return;
    }

    // ============================================
    // CASE 2: User Just Logged In
    // ============================================
    if (!prevUserId && userId) {
      // console.log("🔐 CartProvider: User logged in", { userId });

      isInitializing.current = true;

      setAuthState(true, userId);

      mergeGuestCartOnLogin(userId)
        .then((result) => {
          if (result.hasChanges && result.warnings.length > 0) {
            toast({
              title: "Cart Updated",
              description: `${result.warnings.length} item(s) were updated.`,
              duration: 6000,
            });
          }
          // console.log("✅ Cart merged on login", result);
          setPrevUserId(userId);
        })
        .catch((error) => {
          console.error("❌ Merge failed:", error);
          toast({
            title: "Cart Sync Warning",
            description: "Some items may not be up to date.",
            variant: "destructive",
          });
          setPrevUserId(userId);
        })
        .finally(() => {
          isInitializing.current = false;
        });

      return;
    }

    // ============================================
    // CASE 3: User Logged Out
    // ============================================
    if (prevUserId && !userId) {
      // console.log("🚪 CartProvider: User logged out");

      isInitializing.current = true;

      setAuthState(false, null);

      initializeCart()
        .then(() => {
          // console.log("✅ Guest cart restored");
          setPrevUserId(null);
        })
        .catch((error) => {
          console.error("❌ Guest restore failed:", error);
          setPrevUserId(null);
        })
        .finally(() => {
          isInitializing.current = false;
        });

      return;
    }

    // ============================================
    // CASE 4: User Switched Accounts
    // ============================================
    if (prevUserId && userId && prevUserId !== userId) {
      // console.log("🔄 CartProvider: Account switch", { from: prevUserId, to: userId });

      isInitializing.current = true;

      setAuthState(true, userId);

      initializeCart(userId)
        .then(() => {
          // console.log("✅ New user cart loaded");
          setPrevUserId(userId);
        })
        .catch((error) => {
          console.error("❌ Account switch failed:", error);
          setPrevUserId(userId);
        })
        .finally(() => {
          isInitializing.current = false;
        });

      return;
    }
  }, [session, status, _hasHydrated, isInitialized, prevUserId]);

  return <>{children}</>;
}

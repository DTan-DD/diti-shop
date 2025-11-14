/* eslint-disable react-hooks/set-state-in-effect */
// 📂 components/cart/cart-provider.tsx
// ⚠️ FILE UPDATE - Enhanced version với better error handling

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useCartStore from "@/hooks/use-cart-store";
import { useToast } from "@/hooks/use-toast"; // ⚠️ Adjust path if needed

/**
 * Cart Provider Component
 *
 * Responsibilities:
 * 1. Initialize cart based on auth status when app loads
 * 2. Listen to auth changes (login/logout)
 * 3. Auto-load cart from DB when user logs in
 * 4. Merge guest cart when user logs in
 * 5. Reset to guest cart when user logs out
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { initializeCart, setAuthState, mergeGuestCartOnLogin, isLoggedIn: storeIsLoggedIn, userId: storeUserId } = useCartStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string | null>(null);

  useEffect(() => {
    // Skip if session is still loading
    if (status === "loading") return;

    const userId = session?.user?.id;
    const isLoggedIn = !!userId;

    // ============================================
    // CASE 1: Initial Load (App First Mount)
    // ============================================
    if (!isInitialized) {
      console.log("🚀 CartProvider: Initial load", { isLoggedIn, userId });

      // Update auth state
      setAuthState(isLoggedIn, userId || null);

      // Initialize cart
      if (isLoggedIn && userId) {
        // User logged in → Load from DB
        initializeCart(userId).then(() => {
          console.log("✅ Cart loaded from DB");
        });
      } else {
        // Guest → Use localStorage
        initializeCart().then(() => {
          console.log("✅ Guest cart loaded");
        });
      }

      setIsInitialized(true);
      setPrevUserId(userId || null);
      return;
    }

    // ============================================
    // CASE 2: User Just Logged In (Guest → Logged)
    // ============================================
    if (!prevUserId && userId) {
      console.log("🔐 CartProvider: User logged in", { userId });

      // Update auth state
      setAuthState(true, userId);

      // Merge guest cart with DB cart
      mergeGuestCartOnLogin(userId)
        .then((result) => {
          if (result.hasChanges && result.warnings.length > 0) {
            // Show consolidated warning
            toast({
              title: "Cart Updated",
              description: `${result.warnings.length} item(s) in your cart were updated due to stock changes or unavailability.`,
              duration: 6000,
            });
          }
          console.log("✅ Cart merged on login", result);
        })
        .catch((error) => {
          console.error("❌ Failed to merge cart:", error);
          toast({
            title: "Cart Sync Warning",
            description: "Some items in your cart may not be up to date. Please review your cart.",
            variant: "destructive",
          });
        });

      setPrevUserId(userId);
      return;
    }

    // ============================================
    // CASE 3: User Logged Out (Logged → Guest)
    // ============================================
    if (prevUserId && !userId) {
      console.log("🚪 CartProvider: User logged out");

      // Update auth state
      setAuthState(false, null);

      // Re-initialize as guest (will use localStorage)
      initializeCart().then(() => {
        console.log("✅ Guest cart restored");
      });

      setPrevUserId(null);
      return;
    }

    // ============================================
    // CASE 4: User Switched Accounts (Logged → Different Logged)
    // ============================================
    if (prevUserId && userId && prevUserId !== userId) {
      console.log("🔄 CartProvider: User switched accounts", {
        from: prevUserId,
        to: userId,
      });

      // Update auth state
      setAuthState(true, userId);

      // Load new user's cart (no merge, just replace)
      initializeCart(userId).then(() => {
        console.log("✅ New user cart loaded");
      });

      setPrevUserId(userId);
      return;
    }

    // ============================================
    // CASE 5: No Change (Do Nothing)
    // ============================================
    // Session exists but nothing changed
  }, [session, status, initializeCart, setAuthState, mergeGuestCartOnLogin, isInitialized, prevUserId, toast]);

  // ============================================
  // DEBUG: Log store state changes
  // ============================================
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🛒 Cart Store State:", {
        isLoggedIn: storeIsLoggedIn,
        userId: storeUserId,
        sessionUserId: session?.user?.id,
      });
    }
  }, [storeIsLoggedIn, storeUserId, session]);

  return <>{children}</>;
}

// ============================================
// 📝 HOW IT WORKS:
// ============================================
//
// Flow Diagram:
//
// App Load
//    ↓
// ┌──────────────────────────┐
// │ CartProvider mounts      │
// │ useSession() → status    │
// └──────────────────────────┘
//    ↓
// ┌─────────────────────────────────────────┐
// │ Is Authenticated?                       │
// ├─────────────┬───────────────────────────┤
// │ YES         │ NO                        │
// │ ↓           │ ↓                         │
// │ Load DB     │ Load localStorage         │
// │ cart        │ cart                      │
// └─────────────┴───────────────────────────┘
//    ↓
// Cart Ready
//
// Login Event:
//    ↓
// ┌──────────────────────────┐
// │ Session changes          │
// │ prevUserId: null         │
// │ newUserId: "abc123"      │
// └──────────────────────────┘
//    ↓
// ┌──────────────────────────┐
// │ Merge guest + DB cart    │
// │ Validate stock           │
// │ Show warnings if any     │
// └──────────────────────────┘
//    ↓
// Cart Synced
//
// Logout Event:
//    ↓
// ┌──────────────────────────┐
// │ Session becomes null     │
// │ prevUserId: "abc123"     │
// │ newUserId: null          │
// └──────────────────────────┘
//    ↓
// ┌──────────────────────────┐
// │ Reset to guest mode      │
// │ Clear auth state         │
// │ Load localStorage cart   │
// └──────────────────────────┘
//    ↓
// Guest Cart Active
//
// ============================================
// ⚠️ IMPORTANT NOTES:
// ============================================
//
// 1. This component runs on EVERY session change
// 2. Uses prevUserId to detect state transitions
// 3. Handles 5 cases:
//    - Initial load
//    - Login (guest → logged)
//    - Logout (logged → guest)
//    - Account switch (logged → different logged)
//    - No change
// 4. Shows toast for cart changes during merge
// 5. Logs to console in development mode
//
// ============================================
// 🐛 DEBUGGING:
// ============================================
//
// If cart not loading:
// 1. Check console logs (🚀, ✅, ❌ emojis)
// 2. Check Network tab for DB requests
// 3. Check Application > LocalStorage > cart-store
// 4. Check session data in useSession()
//
// Common issues:
// - Missing SessionProvider wrapper
// - Wrong provider order
// - Session not being passed to SessionProvider
// - initializeCart() being called multiple times

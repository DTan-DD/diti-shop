// 📂 components/cart/cart-provider.tsx
// ⭐ FILE MỚI - Tạo file này để handle cart initialization

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import useCartStore from "@/hooks/use-cart-store";

/**
 * Cart Provider Component
 *
 * Responsibilities:
 * 1. Initialize cart based on auth status when app loads
 * 2. Listen to auth changes (login/logout)
 * 3. Auto-load cart from DB when user logs in
 * 4. Reset cart when user logs out
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { initializeCart, setAuthState } = useCartStore();

  useEffect(() => {
    if (status !== "authenticated" && status !== "unauthenticated") return;

    const userId = session?.user?.id ?? null;
    const isLoggedIn = !!userId;

    setAuthState(isLoggedIn, userId);

    // Chỉ init khi chưa init hoặc userId khác
    initializeCart(isLoggedIn ? userId : undefined);
  }, [session?.user?.id, status, initializeCart, setAuthState]);

  return <>{children}</>;
}

// ============================================
// 📝 USAGE INSTRUCTIONS:
// ============================================
// 1. Wrap your app with this provider in layout.tsx or providers.tsx
// 2. Make sure SessionProvider from next-auth is already wrapping the app
//
// Example in app/layout.tsx:
//
// import { CartProvider } from "@/components/cart/cart-provider";
// import { SessionProvider } from "next-auth/react";
//
// export default function RootLayout({ children }) {
//   return (
//     <SessionProvider>
//       <CartProvider>
//         {children}
//       </CartProvider>
//     </SessionProvider>
//   );
// }
//
// ============================================
// ⚠️ IMPORTANT:
// ============================================
// - This component must be a Client Component ("use client")
// - SessionProvider must wrap this component
// - This will auto-initialize cart on every page load
// - No manual initialization needed in other components

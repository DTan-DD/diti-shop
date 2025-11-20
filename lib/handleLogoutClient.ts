"use client";
import useCartStore from "@/hooks/use-cart-store";
import { SignOut } from "@/lib/actions/user.actions";

/**
 * Hàm logout client-side — gọi từ UI.
 */
export async function handleLogoutClient() {
  const { setAuthState, clearCartLocalStorage } = useCartStore.getState();

  // Before signOut:
  setAuthState(false, null);
  // 1️⃣ Xóa localStorage / Zustand cart
  clearCartLocalStorage();

  // 2️⃣ Gọi server action logout
  await SignOut();

  // 3️⃣ Redirect client-side (dự phòng nếu server chưa redirect)
  //   window.location.href = "/";
}

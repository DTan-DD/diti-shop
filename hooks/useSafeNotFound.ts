"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";

export function useSafeNotFound(condition: boolean, redirectTo = "/cart") {
  const router = useRouter();
  const isServer = typeof window === "undefined";

  if (isServer && condition) {
    // ⛔ Server render → dùng notFound() là đúng chuẩn
    notFound();
  }

  // Client side
  useEffect(() => {
    if (!isServer && condition) {
      router.replace(redirectTo); // an toàn và không gây hydration lỗi
    }
  }, [condition, router, isServer]);

  return;
}

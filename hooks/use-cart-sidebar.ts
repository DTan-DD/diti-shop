import { usePathname } from "next/navigation";
import useCartStore from "./use-cart-store";
import { i18n } from "@/i18n-config";
import useDeviceType from "./use-device-type";

const locales = i18n.locales.filter((locale) => locale.code !== "vi-VN").map((locale) => locale.code);

const isNotInPaths = (s: string) => {
  const localePattern = `/(?:${locales.join("|")})`;
  const pathsPattern = `^(?:${localePattern})?(?:/$|/cart$|/checkout$|/sign-in$|/sign-up$|/order(?:/.*)?$|/account(?:/.*)?$|/admin(?:/.*)?$)?$`;
  return !new RegExp(pathsPattern).test(s);
};

function useCartSidebar() {
  const {
    cart: { items },
  } = useCartStore();
  const deviceType = useDeviceType();
  const currentPath = usePathname();
  // console.log("currentPath", items.length);
  // ✅ FIX: Không check deviceType nữa, để CSS @media xử lý
  // Chỉ check: có items + đúng route
  return items.length > 0 && deviceType === "desktop" && isNotInPaths(currentPath);
}

export default useCartSidebar;

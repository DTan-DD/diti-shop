"use client";
import useCartStore from "@/hooks/use-cart-store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import { Button, buttonVariants } from "../ui/button";
import { Separator } from "../ui/separator";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Trash2 } from "lucide-react";
import ProductPrice from "./product/product-price";
import { useLocale, useTranslations } from "next-intl";
import { getDirection } from "@/i18n-config";
import useSettingStore from "@/hooks/use-setting-store";
import { useHydration } from "@/hooks/useHydration";

export default function CartSidebar({ visible }: { visible: boolean }) {
  const isHydrated = useHydration(); // ✅ USE HYDRATION HOOK
  const hydrated = useCartStore((s) => s._hasHydrated);
  const {
    cart: { items, itemsPrice },
    updateItem,
    removeItem,
  } = useCartStore();

  const {
    setting: {
      common: { freeShippingMinPrice },
    },
  } = useSettingStore();

  const t = useTranslations();
  const locale = useLocale();

  // ✅ FIX: Wait for both hydrations
  // if (!isHydrated || !hydrated) return null;

  const hidden = !visible || !isHydrated || !hydrated;

  // ✅ SIMPLE: Không cần check hydration, để Zustand tự xử lý
  return (
    // <div className="w-36 h-screen flex flex-col border-l bg-background">
    <div
      className={cn("w-34 z-20 h-screen flex flex-col border-l bg-background transition-transform duration-300", hidden ? "translate-x-full hidden pointer-events-none" : "translate-x-0 opacity-100")}
    >
      {/* Header */}
      <div className="p-4 space-y-4 flex-shrink-0">
        <div className="text-center space-y-2">
          <div className="text-sm">{t("Cart.Subtotal")}</div>
          <div className="font-bold">
            <ProductPrice price={itemsPrice} plain />
          </div>
          {itemsPrice > freeShippingMinPrice && <div className="text-center text-xs text-green-600 dark:text-green-400">{t("Cart.Your order qualifies for FREE Shipping")}</div>}
          <Link className={cn(buttonVariants({ variant: "outline" }), "rounded-full hover:no-underline w-full text-xs py-1 h-auto")} href="/cart">
            {t("Cart.Go to Cart")}
          </Link>
        </div>
        <Separator />
      </div>

      {/* Scrollable Items - Native scroll */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-4">{t("Cart.Empty")}</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const stableKey = item.clientId ?? `${item.product}-${item.color ?? "n"}-${item.size ?? "n"}`;
              return (
                <div key={stableKey} className="space-y-2">
                  <div className="flex flex-col items-center text-center">
                    {/* Image */}
                    <Link href={`/product/${item.slug}`} className="mb-2">
                      <div className="relative h-16 w-16">
                        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-contain" priority={false} />
                      </div>
                    </Link>

                    {/* Name */}
                    <div className="w-full min-h-[2rem] mb-1">
                      <Link href={`/product/${item.slug}`}>
                        <p className="text-xs font-medium line-clamp-2 hover:text-primary transition-colors">{item.name}</p>
                      </Link>
                    </div>

                    {/* Price */}
                    <div className="text-xs font-bold mb-2">
                      <ProductPrice price={item.price} plain />
                    </div>

                    {/* Controls */}
                    <div className="flex gap-1 w-full justify-center items-center">
                      <Select
                        value={item.quantity.toString()}
                        onValueChange={(value) => {
                          updateItem(item, Number(value));
                        }}
                      >
                        <SelectTrigger className="text-xs w-12 h-6 py-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({
                            length: Math.min(item.availableStock || item.countInStock || 10, 99),
                          }).map((_, i) => (
                            <SelectItem value={(i + 1).toString()} key={i + 1}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant="outline" size="sm" onClick={() => removeItem(item.clientId)} className="h-6 w-6 p-0">
                        <Trash2 className="w-3 h-3" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                  </div>
                  <Separator />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// 📂 hooks/use-cart-store.ts
// ⚠️ CRITICAL FIXES cho hydration errors

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Cart, OrderItem, ShippingAddress } from "@/types";
import { calcDeliveryDateAndPrice } from "@/lib/actions/order.actions";
import { syncCartWithLatestStock } from "@/lib/actions/cart.actions";
import { getUserCartFromDB, saveCartToDB, mergeAndValidateCart } from "@/lib/actions/cart-db.actions";

const initialState: Cart = {
  items: [],
  itemsPrice: 0,
  taxPrice: undefined,
  shippingPrice: undefined,
  totalPrice: 0,
  paymentMethod: undefined,
  deliveryDateIndex: undefined,
  shippingAddress: undefined,
};

interface CartState {
  cart: Cart;
  isLoggedIn: boolean;
  userId: string | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  addItem: (item: OrderItem, quantity: number) => Promise<string>;
  updateItem: (item: OrderItem, quantity: number) => Promise<void>;
  removeItem: (clientId: string) => Promise<void>;
  clearCart: () => void;
  clearCartLocalStorage: () => void;
  setShippingAddress: (shippingAddress: ShippingAddress) => Promise<void>;
  setPaymentMethod: (paymentMethod: string) => void;
  setDeliveryDateIndex: (index: number) => Promise<void>;
  syncCartStock: () => Promise<{ success: boolean; removedCount: number }>;

  initializeCart: (userId?: string) => Promise<void>;
  syncWithDB: () => Promise<void>;
  loadCartFromDB: (userId: string) => Promise<void>;
  mergeGuestCartOnLogin: (userId: string) => Promise<{ warnings: string[]; hasChanges: boolean }>;
  setAuthState: (isLoggedIn: boolean, userId: string | null) => void;
}

let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 500;

const useCartStore = create(
  persist<CartState>(
    (set, get) => ({
      cart: initialState,
      isLoggedIn: false,
      userId: null,
      isSyncing: false,
      lastSyncedAt: null,
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      // ============================================
      // ✅ FIX: Initialize Cart with better error handling
      // ============================================
      initializeCart: async (userId?: string) => {
        const { isSyncing, lastSyncedAt } = get();

        if (isSyncing) {
          console.log("⏳ Cart initialization already in progress");
          return;
        }

        if (lastSyncedAt && Date.now() - lastSyncedAt.getTime() < 5000) {
          console.log("⏭️ Skipping initialization (too soon)");
          return;
        }

        try {
          if (userId) {
            await get().loadCartFromDB(userId);
            set({ isLoggedIn: true, userId });
          } else {
            set({ isLoggedIn: false, userId: null });
          }
        } catch (error) {
          console.error("❌ Failed to initialize cart:", error);
          // Fallback to guest mode
          set({ isLoggedIn: false, userId: null });
        }
      },

      // ============================================
      // ✅ FIX: Load from DB with timeout
      // ============================================
      loadCartFromDB: async (userId: string) => {
        try {
          set({ isSyncing: true });

          // ✅ Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("DB load timeout")), 5000));

          const loadPromise = getUserCartFromDB(userId);
          const result = (await Promise.race([loadPromise, timeoutPromise])) as Awaited<ReturnType<typeof getUserCartFromDB>>;

          if (result.success && result.data) {
            set({
              cart: result.data,
              userId,
              isLoggedIn: true,
              lastSyncedAt: new Date(),
            });
          } else {
            set({
              userId,
              isLoggedIn: true,
            });
          }
        } catch (error) {
          console.error("❌ Failed to load cart from DB:", error);
          // Continue with current cart
          set({
            userId,
            isLoggedIn: true,
          });
        } finally {
          set({ isSyncing: false });
        }
      },

      // ============================================
      // ✅ FIX: Sync with proper debouncing
      // ============================================
      syncWithDB: async () => {
        const { isLoggedIn, userId, cart, isSyncing } = get();

        if (!isLoggedIn || !userId || isSyncing) return;

        if (syncTimeout) clearTimeout(syncTimeout);

        syncTimeout = setTimeout(async () => {
          try {
            set({ isSyncing: true });

            const result = await saveCartToDB(userId, cart);

            if (result.success) {
              set({ lastSyncedAt: new Date() });
            }
          } catch (error) {
            console.error("❌ Sync error:", error);
          } finally {
            // ✅ Use setTimeout to avoid state update during render
            setTimeout(() => {
              const currentState = get();
              if (currentState.isSyncing) {
                set({ isSyncing: false });
              }
            }, 0);
          }
        }, SYNC_DEBOUNCE_MS);
      },

      // ============================================
      // ✅ FIX: Merge with better error handling
      // ============================================
      mergeGuestCartOnLogin: async (userId: string) => {
        try {
          set({ isSyncing: true });
          const localCart = get().cart;

          const dbCartResult = await getUserCartFromDB(userId);
          const dbCart = dbCartResult.data;

          const mergeResult = await mergeAndValidateCart(userId, dbCart, localCart);

          if (mergeResult.success && mergeResult.data) {
            set({
              cart: mergeResult.data,
              userId,
              isLoggedIn: true,
              lastSyncedAt: new Date(),
            });

            return {
              warnings: mergeResult.warnings,
              hasChanges: mergeResult.hasChanges,
            };
          }

          return { warnings: [], hasChanges: false };
        } catch (error) {
          console.error("❌ Merge cart error:", error);
          return { warnings: ["Failed to merge cart"], hasChanges: false };
        } finally {
          set({ isSyncing: false });
        }
      },

      setAuthState: (isLoggedIn: boolean, userId: string | null) => {
        set({ isLoggedIn, userId });
      },

      // ============================================
      // ✅ FIX: Add/Update/Remove với proper error handling
      // ============================================
      addItem: async (item: OrderItem, quantity: number) => {
        try {
          const { items, shippingAddress } = get().cart;
          const existItem = items.find((x) => x.product === item.product && x.color === item.color && x.size === item.size);

          if (existItem) {
            if (existItem.countInStock < quantity + existItem.quantity) {
              throw new Error("Not enough items in stock");
            }
          } else {
            if (item.countInStock < item.quantity) {
              throw new Error("Not enough items in stock");
            }
          }

          const updatedCartItems = existItem
            ? items.map((x) => (x.product === item.product && x.color === item.color && x.size === item.size ? { ...existItem, quantity: existItem.quantity + quantity } : x))
            : [...items, { ...item, quantity }];

          set({
            cart: {
              ...get().cart,
              items: updatedCartItems,
              ...(await calcDeliveryDateAndPrice({
                items: updatedCartItems,
                shippingAddress,
              })),
            },
          });

          // ✅ Non-blocking sync
          get().syncWithDB().catch(console.error);

          const foundItem = updatedCartItems.find((x) => x.product === item.product && x.color === item.color && x.size === item.size);
          if (!foundItem) {
            throw new Error("Item not found in cart");
          }
          return foundItem.clientId;
        } catch (error) {
          console.error("❌ Add item error:", error);
          throw error;
        }
      },

      updateItem: async (item: OrderItem, quantity: number) => {
        const { items, shippingAddress } = get().cart;
        const exist = items.find((x) => x.product === item.product && x.color === item.color && x.size === item.size);
        if (!exist) return;

        const updatedCartItems = items.map((x) => (x.product === item.product && x.color === item.color && x.size === item.size ? { ...exist, quantity: quantity } : x));

        set({
          cart: {
            ...get().cart,
            items: updatedCartItems,
            ...(await calcDeliveryDateAndPrice({
              items: updatedCartItems,
              shippingAddress,
            })),
          },
        });

        get().syncWithDB().catch(console.error);
      },

      removeItem: async (clientId: string) => {
        const { items, shippingAddress } = get().cart;
        // const updatedCartItems = items.filter((x) => x.product !== item.product || x.color !== item.color || x.size !== item.size);
        const updatedCartItems = items.filter((x) => x.clientId !== clientId);

        set({
          cart: {
            ...get().cart,
            items: updatedCartItems,
            ...(await calcDeliveryDateAndPrice({
              items: updatedCartItems,
              shippingAddress,
            })),
          },
        });

        get().syncWithDB().catch(console.error);
      },

      setShippingAddress: async (shippingAddress: ShippingAddress) => {
        const { items } = get().cart;
        set({
          cart: {
            ...get().cart,
            shippingAddress,
            ...(await calcDeliveryDateAndPrice({
              items,
              shippingAddress,
            })),
          },
        });
        get().syncWithDB().catch(console.error);
      },

      setPaymentMethod: (paymentMethod: string) => {
        set({
          cart: {
            ...get().cart,
            paymentMethod,
          },
        });
        get().syncWithDB().catch(console.error);
      },

      setDeliveryDateIndex: async (index: number) => {
        const { items, shippingAddress } = get().cart;
        set({
          cart: {
            ...get().cart,
            ...(await calcDeliveryDateAndPrice({
              items,
              shippingAddress,
              deliveryDateIndex: index,
            })),
          },
        });
        get().syncWithDB().catch(console.error);
      },

      clearCart: () => {
        set({
          cart: {
            ...initialState,
          },
        });
        get().syncWithDB().catch(console.error);
      },

      clearCartLocalStorage: () => {
        set({
          cart: {
            ...initialState,
          },
        });
      },

      syncCartStock: async () => {
        const { items } = get().cart;
        const result = await syncCartWithLatestStock(items);

        if (result.success) {
          set({
            cart: {
              ...get().cart,
              items: result.items,
            },
          });
        }

        return {
          success: result.success,
          removedCount: result.removedCount,
        };
      },
    }),
    {
      name: "cart-store",
      partialize: (state) => {
        // ✅ FIX: Proper typing và fallback
        const partialState = {
          cart: state?.cart || initialState,
        };
        return partialState as unknown as CartState;
      },
      onRehydrateStorage: () => (state) => {
        console.log("🔄 Cart store rehydrated");
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useCartStore;

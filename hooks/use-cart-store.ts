// 📂 hooks/use-cart-store.ts
// ⚠️ FILE MODIFY - REPLACE toàn bộ file hiện tại bằng code này

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Cart, OrderItem, ShippingAddress } from "@/types";
import { calcDeliveryDateAndPrice } from "@/lib/actions/order.actions";
import { syncCartWithLatestStock } from "@/lib/actions/cart.actions";
// ⭐ NEW IMPORTS
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

// ⭐ UPDATED INTERFACE
interface CartState {
  cart: Cart;

  // ⭐ NEW: Sync state tracking
  isLoggedIn: boolean;
  userId: string | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;

  // === NEW ===
  _hasHydrated: boolean; // trạng thái đã hydrate persist
  setHasHydrated: (state: boolean) => void; // method để set

  // Existing methods
  addItem: (item: OrderItem, quantity: number) => Promise<string>;
  updateItem: (item: OrderItem, quantity: number) => Promise<void>;
  removeItem: (item: OrderItem) => Promise<void>;
  clearCart: () => void;
  setShippingAddress: (shippingAddress: ShippingAddress) => Promise<void>;
  setPaymentMethod: (paymentMethod: string) => void;
  setDeliveryDateIndex: (index: number) => Promise<void>;
  syncCartStock: () => Promise<{ success: boolean; removedCount: number }>;

  // ⭐ NEW METHODS
  initializeCart: (userId?: string) => Promise<void>;
  syncWithDB: () => Promise<void>;
  loadCartFromDB: (userId: string) => Promise<void>;
  mergeGuestCartOnLogin: (userId: string) => Promise<{ warnings: string[]; hasChanges: boolean }>;
  setAuthState: (isLoggedIn: boolean, userId: string | null) => void;
}

// ⭐ Debounce helper
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 500;

const useCartStore = create(
  persist<CartState>(
    (set, get) => ({
      cart: initialState,

      // ⭐ NEW: Initial sync state
      isLoggedIn: false,
      userId: null,
      isSyncing: false,
      lastSyncedAt: null,

      // === NEW ===
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),

      // ============================================
      // ⭐ NEW: Initialize Cart (called on app load)
      // ============================================
      initializeCart: async (userId?: string) => {
        const { isSyncing, lastSyncedAt } = get();
        console.log("initializeCart", { isSyncing, lastSyncedAt, userId });
        // ⭐ Avoid multiple simultaneous initializations
        if (isSyncing) return;

        // ⭐ Debounce initialization (optional)
        if (lastSyncedAt && Date.now() - lastSyncedAt.getTime() < 5000) {
          return;
        }

        if (userId) {
          // User is logged in → Load from DB
          await get().loadCartFromDB(userId);
          set({ isLoggedIn: true, userId });
        } else {
          // Guest user → Use localStorage
          set({ isLoggedIn: false, userId: null });
        }
      },

      // ============================================
      // ⭐ NEW: Load Cart from Database
      // ============================================
      loadCartFromDB: async (userId: string) => {
        try {
          set({ isSyncing: true });

          const result = await getUserCartFromDB(userId);
          console.log("loadCartFromDB result", result);
          if (result.success && result.data) {
            // Load cart từ DB
            set({
              cart: result.data,
              userId,
              isLoggedIn: true,
              lastSyncedAt: new Date(),
            });
          } else {
            // No cart in DB → Keep current cart (localStorage)
            set({
              userId,
              isLoggedIn: true,
            });
          }
        } catch (error) {
          console.error("Failed to load cart from DB:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // ============================================
      // ⭐ NEW: Sync Cart to Database (Debounced)
      // ============================================
      syncWithDB: async () => {
        const { isLoggedIn, userId, cart, isSyncing } = get();
        console.log("syncWithDB", { isLoggedIn, userId, isSyncing });
        if (!isLoggedIn || !userId || isSyncing) return;

        // Clear previous debounce
        if (syncTimeout) clearTimeout(syncTimeout);

        // Debounce sync
        syncTimeout = setTimeout(async () => {
          try {
            set({ isSyncing: true });

            const result = await saveCartToDB(userId, cart);

            if (result.success) {
              set({ lastSyncedAt: new Date() });
            }
          } catch (error) {
            console.error("Sync error:", error);
          } finally {
            // ⚡ set isSyncing false AFTER next tick, tránh loop
            setTimeout(() => set({ isSyncing: false }), 0);
          }
        }, SYNC_DEBOUNCE_MS);
      },

      // ============================================
      // ⭐ NEW: Merge Guest Cart on Login
      // ============================================
      mergeGuestCartOnLogin: async (userId: string) => {
        try {
          set({ isSyncing: true });
          console.log("mergeGuestCartOnLogin", { userId });
          const localCart = get().cart;

          // Load DB cart
          const dbCartResult = await getUserCartFromDB(userId);
          const dbCart = dbCartResult.data;

          // Merge and validate
          const mergeResult = await mergeAndValidateCart(userId, dbCart, localCart);

          if (mergeResult.success && mergeResult.data) {
            // Update store with merged cart
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
          console.error("Merge cart error:", error);
          return { warnings: ["Failed to merge cart"], hasChanges: false };
        } finally {
          set({ isSyncing: false });
        }
      },

      // ============================================
      // ⭐ NEW: Set Auth State
      // ============================================
      setAuthState: (isLoggedIn: boolean, userId: string | null) => {
        set({ isLoggedIn, userId });
      },

      // ============================================
      // ⚠️ MODIFIED: Add Item (with DB sync)
      // ============================================
      addItem: async (item: OrderItem, quantity: number) => {
        const { items, shippingAddress } = get().cart;
        const existItem = items.find((x) => x.product === item.product && x.color === item.color && x.size === item.size);
        console.log("existItem", existItem);
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

        // ⭐ Sync to DB if logged in
        await get().syncWithDB();

        const foundItem = updatedCartItems.find((x) => x.product === item.product && x.color === item.color && x.size === item.size);
        if (!foundItem) {
          throw new Error("Item not found in cart");
        }
        return foundItem.clientId;
      },

      // ============================================
      // ⚠️ MODIFIED: Update Item (with DB sync)
      // ============================================
      updateItem: async (item: OrderItem, quantity: number) => {
        const { items, shippingAddress } = get().cart;
        const exist = items.find((x) => x.product === item.product && x.color === item.color && x.size === item.size);
        if (!exist) return;
        console.log("update item ", exist);

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

        // ⭐ Debounced sync to DB (for quantity changes)
        await get().syncWithDB();
      },

      // ============================================
      // ⚠️ MODIFIED: Remove Item (with DB sync)
      // ============================================
      removeItem: async (item: OrderItem) => {
        const { items, shippingAddress } = get().cart;
        const updatedCartItems = items.filter((x) => x.product !== item.product || x.color !== item.color || x.size !== item.size);
        console.log("updatedCartItems", updatedCartItems);
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

        // ⭐ Sync to DB if logged in
        await get().syncWithDB();
      },

      // ============================================
      // ⚠️ MODIFIED: Set Shipping Address (with DB sync)
      // ============================================
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
        console.log("shippingAddress", shippingAddress);
        // ⭐ Sync to DB if logged in
        await get().syncWithDB();
      },

      // ============================================
      // ⚠️ MODIFIED: Set Payment Method (with DB sync)
      // ============================================
      setPaymentMethod: (paymentMethod: string) => {
        set({
          cart: {
            ...get().cart,
            paymentMethod,
          },
        });
        console.log("paymentMethod", paymentMethod);
        // ⭐ Sync to DB if logged in (no await needed)
        get().syncWithDB();
      },

      // ============================================
      // ⚠️ MODIFIED: Set Delivery Date Index (with DB sync)
      // ============================================
      setDeliveryDateIndex: async (index: number) => {
        const { items, shippingAddress } = get().cart;
        console.log("index", index);
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

        // ⭐ Sync to DB if logged in
        await get().syncWithDB();
      },

      // ============================================
      // EXISTING: Clear Cart (unchanged)
      // ============================================
      clearCart: () => {
        set({
          cart: {
            ...get().cart,
            items: [],
          },
        });
        console.log("clearCart");
        // ⭐ Sync to DB if logged in
        get().syncWithDB();
      },

      // ============================================
      // EXISTING: Sync Cart Stock (unchanged)
      // ============================================
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
        console.log("syncCartStock result", result);
        return {
          success: result.success,
          removedCount: result.removedCount,
        };
      },
    }),
    {
      name: "cart-store",
      // ⭐ Chỉ persist cart data, không persist sync state
      // Cast the partial result to CartState to satisfy the persist typing
      partialize: (state) => {
        if (!state.cart) {
          console.warn("Cart is undefined, using initialState");
          return { cart: initialState } as CartState;
        }
        return { cart: state.cart } as unknown as CartState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true); // set _hasHydrated khi persist hydrate xong
      },
    }
  )
);

export default useCartStore;

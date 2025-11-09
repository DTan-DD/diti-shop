// hooks/useCartValidation.ts

import { useState } from "react";
import { validateCartStock } from "@/lib/actions/cart.actions";
import useCartStore from "@/hooks/use-cart-store";
import { OrderItem } from "@/types";

interface ValidationState {
  isValidating: boolean;
  showDialog: boolean;
  errors: Array<{
    productId: string;
    productName: string;
    slug: string;
    requested: number;
    available: number;
  }>;
  warnings: Array<{
    productId: string;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
  }>;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export function useCartValidation() {
  const { cart, syncCartStock } = useCartStore();
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    showDialog: false,
    errors: [],
    warnings: [],
    hasErrors: false,
    hasWarnings: false,
  });

  // Validate cart trước khi checkout
  const validateCart = async (): Promise<boolean> => {
    if (cart.items.length === 0) {
      return false;
    }

    setValidationState((prev) => ({ ...prev, isValidating: true }));

    try {
      const validation = await validateCartStock(cart.items);

      if (validation.success) {
        // All good, cho phép checkout
        setValidationState((prev) => ({ ...prev, isValidating: false }));
        return true;
      }

      // Có vấn đề về stock
      setValidationState({
        isValidating: false,
        showDialog: true,
        errors: validation.errors,
        warnings: validation.warnings,
        hasErrors: validation.hasErrors,
        hasWarnings: validation.hasWarnings,
      });

      return false;
    } catch (error) {
      console.error("Validation error:", error);
      setValidationState((prev) => ({ ...prev, isValidating: false }));
      return false;
    }
  };

  // Fix cart: sync với stock mới và cho phép continue
  const fixCartAndContinue = async (): Promise<boolean> => {
    const result = await syncCartStock();

    if (result.success) {
      setValidationState((prev) => ({ ...prev, showDialog: false }));

      // Validate lại sau khi sync
      const revalidation = await validateCartStock(useCartStore.getState().cart.items);

      if (revalidation.success) {
        return true;
      } else if (revalidation.hasErrors) {
        // Vẫn còn errors sau sync -> show lại dialog
        setValidationState({
          isValidating: false,
          showDialog: true,
          errors: revalidation.errors,
          warnings: revalidation.warnings,
          hasErrors: revalidation.hasErrors,
          hasWarnings: revalidation.hasWarnings,
        });
        return false;
      }
    }

    return false;
  };

  // Remove các items out of stock
  const removeOutOfStockItems = () => {
    const { items } = useCartStore.getState().cart;
    const errorProductIds = new Set(validationState.errors.map((e) => e.productId));

    // Remove items có error
    items.forEach((item) => {
      if (errorProductIds.has(item.product)) {
        useCartStore.getState().removeItem(item);
      }
    });

    setValidationState((prev) => ({ ...prev, showDialog: false }));
  };

  const closeDialog = () => {
    setValidationState((prev) => ({ ...prev, showDialog: false }));
  };

  return {
    validateCart,
    fixCartAndContinue,
    removeOutOfStockItems,
    closeDialog,
    validationState,
  };
}

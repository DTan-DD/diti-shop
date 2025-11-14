/* eslint-disable @typescript-eslint/no-explicit-any */
// 📂 lib/actions/cart-db.actions.ts
// ⭐ FILE MỚI - Tạo file này trong thư mục lib/actions/

"use server";

import { connectToDatabase } from "@/lib/db";
import Cart, { ICart } from "@/lib/db/models/cart.model";
import Product, { IProduct } from "@/lib/db/models/product.model"; // ⚠️ Import Product model có sẵn
import { Cart as CartType, OrderItem } from "@/types";
import { calcDeliveryDateAndPrice } from "./order.actions"; // ⚠️ Import function có sẵn

// ============================================
// 1. GET USER CART FROM DATABASE
// ============================================
export async function getUserCartFromDB(userId: string) {
  try {
    await connectToDatabase();

    const cart = await Cart.findOne({ userId }).lean<ICart>();

    if (!cart) {
      // Nếu user chưa có cart trong DB, return null
      return {
        success: true,
        data: null,
        message: "No cart found",
      };
    }

    // Convert MongoDB document to CartType format
    const formattedCart: CartType = {
      items: cart.items.map((item: any) => ({
        product: item.product.toString(),
        name: item.name,
        slug: item.slug,
        category: item.category,
        image: item.image,
        price: item.price,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        countInStock: item.countInStock,
        clientId: item.clientId,
      })),
      itemsPrice: cart.itemsPrice,
      taxPrice: cart.taxPrice,
      shippingPrice: cart.shippingPrice,
      totalPrice: cart.totalPrice,
      shippingAddress: cart.shippingAddress,
      paymentMethod: cart.paymentMethod,
      deliveryDateIndex: cart.deliveryDateIndex,
    };
    const safeCart = JSON.parse(JSON.stringify(formattedCart));

    return {
      success: true,
      data: safeCart,
      message: "Cart loaded successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      message: error.message || "Failed to load cart from database",
    };
  }
}

// ============================================
// 2. SAVE CART TO DATABASE
// ============================================
export async function saveCartToDB(userId: string, cartData: CartType) {
  try {
    await connectToDatabase();
    console.log("Saving cart to database...", cartData);
    // Upsert: Update nếu có, create nếu chưa
    const cart = await Cart.findOneAndUpdate(
      { userId },
      {
        userId,
        items: cartData.items.map((item) => ({
          product: item.product,
          name: item.name,
          slug: item.slug,
          category: item.category,
          image: item.image,
          price: item.price,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          countInStock: item.countInStock,
          clientId: item.clientId,
        })),
        itemsPrice: cartData.itemsPrice,
        taxPrice: cartData.taxPrice,
        shippingPrice: cartData.shippingPrice,
        totalPrice: cartData.totalPrice,
        shippingAddress: cartData.shippingAddress,
        paymentMethod: cartData.paymentMethod,
        deliveryDateIndex: cartData.deliveryDateIndex,
      },
      {
        upsert: true, // Create if not exists
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );
    const safeCart = JSON.parse(JSON.stringify(cart));

    return {
      success: true,
      data: safeCart,
      message: "Cart saved successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      message: error.message || "Failed to save cart to database",
    };
  }
}

// ============================================
// 3. MERGE AND VALIDATE CART
// ============================================
export async function mergeAndValidateCart(userId: string, dbCart: CartType | null, localCart: CartType) {
  try {
    await connectToDatabase();

    const warnings: string[] = [];
    let mergedItems: OrderItem[] = [];

    // STEP 1: Merge items (Local cart ưu tiên)
    const itemMap = new Map<string, OrderItem>();

    // Add DB cart items first
    if (dbCart && dbCart.items.length > 0) {
      dbCart.items.forEach((item) => {
        const key = `${item.product}-${item.color}-${item.size}`;
        itemMap.set(key, item);
      });
    }

    // Overwrite with local cart items (local wins)
    localCart.items.forEach((item) => {
      const key = `${item.product}-${item.color}-${item.size}`;
      itemMap.set(key, item);
    });

    mergedItems = Array.from(itemMap.values());

    // STEP 2: Validate và update từ Product collection
    const validatedItems: OrderItem[] = [];

    for (const item of mergedItems) {
      // Fetch latest product data
      const product = await Product.findById(item.product).lean<IProduct>();

      if (!product) {
        // Product không tồn tại → Remove
        warnings.push(`Product "${item.name}" no longer exists and was removed from cart`);
        continue;
      }

      // Check if product is published
      if (!product.isPublished) {
        warnings.push(`Product "${item.name}" is no longer available and was removed`);
        continue;
      }

      // Check stock availability
      if (product.availableStock === 0) {
        warnings.push(`Product "${item.name}" is out of stock and was removed`);
        continue;
      }

      // Adjust quantity if exceeds stock
      let adjustedQuantity = item.quantity;
      if (item.quantity > product.availableStock) {
        adjustedQuantity = product.availableStock;
        warnings.push(`Quantity for "${item.name}" (${item.color}, ${item.size}) was reduced from ${item.quantity} to ${adjustedQuantity} due to limited stock`);
      }

      // Update with latest data
      validatedItems.push({
        ...item,
        price: product.price, // ⚠️ Update price mới nhất
        countInStock: product.availableStock,
        quantity: adjustedQuantity,
      });
    }

    // STEP 3: Recalculate prices
    const finalCart: CartType = {
      items: validatedItems,
      itemsPrice: 0,
      taxPrice: undefined,
      shippingPrice: undefined,
      totalPrice: 0,
      shippingAddress: localCart.shippingAddress || dbCart?.shippingAddress,
      paymentMethod: localCart.paymentMethod || dbCart?.paymentMethod,
      deliveryDateIndex: localCart.deliveryDateIndex ?? dbCart?.deliveryDateIndex,
    };

    // Calculate prices using existing function
    const priceData = await calcDeliveryDateAndPrice({
      items: validatedItems,
      shippingAddress: finalCart.shippingAddress,
      deliveryDateIndex: finalCart.deliveryDateIndex,
    });

    finalCart.itemsPrice = priceData.itemsPrice;
    finalCart.taxPrice = priceData.taxPrice;
    finalCart.shippingPrice = priceData.shippingPrice;
    finalCart.totalPrice = priceData.totalPrice;
    finalCart.deliveryDateIndex = priceData.deliveryDateIndex;

    // STEP 4: Save merged cart to DB
    await saveCartToDB(userId, finalCart);

    const safeCart = JSON.parse(JSON.stringify(finalCart));

    return {
      success: true,
      data: safeCart,
      warnings,
      hasChanges: warnings.length > 0,
      message: "Cart merged and validated successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      warnings: [],
      hasChanges: false,
      message: error.message || "Failed to merge and validate cart",
    };
  }
}

// ============================================
// 4. DELETE USER CART (Optional - ít dùng)
// ============================================
export async function deleteUserCart(userId: string) {
  try {
    await connectToDatabase();

    await Cart.findOneAndDelete({ userId });

    return {
      success: true,
      message: "Cart deleted successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to delete cart",
    };
  }
}

// ============================================
// 5. VALIDATE CART STOCK (Helper function)
// ============================================
export async function validateCartStock(items: OrderItem[]) {
  try {
    await connectToDatabase();

    const warnings: string[] = [];
    const validatedItems: OrderItem[] = [];

    for (const item of items) {
      const product = await Product.findById(item.product).lean<IProduct>();

      if (!product || !product.isPublished) {
        warnings.push(`Product "${item.name}" is no longer available`);
        continue;
      }

      if (product.availableStock === 0) {
        warnings.push(`Product "${item.name}" is out of stock`);
        continue;
      }

      if (item.quantity > product.availableStock) {
        warnings.push(`Only ${product.availableStock} items available for "${item.name}"`);
      }

      validatedItems.push({
        ...item,
        price: product.price,
        countInStock: product.availableStock,
      });
    }

    return {
      success: warnings.length === 0,
      validatedItems,
      warnings,
      hasIssues: warnings.length > 0,
    };
  } catch (error: any) {
    return {
      success: false,
      validatedItems: [],
      warnings: ["Failed to validate cart stock"],
      hasIssues: true,
    };
  }
}

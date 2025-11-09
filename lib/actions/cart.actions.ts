"use server";
// lib/actions/cart.actions.ts

import { connectToDatabase } from "@/lib/db";
import Product from "@/lib/db/models/product.model";
import { OrderItem } from "@/types";
export async function validateCartStock(items: OrderItem[]) {
  console.log("Product import:", Product);
  try {
    await connectToDatabase();

    const productIds = items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select("_id availableStock name slug");

    const stockMap = new Map(products.map((p) => [p._id.toString(), p]));

    const errors: Array<{
      productId: string;
      productName: string;
      slug: string;
      requested: number;
      available: number;
    }> = [];

    const warnings: Array<{
      productId: string;
      productName: string;
      oldQuantity: number;
      newQuantity: number;
    }> = [];

    for (const item of items) {
      const product = stockMap.get(item.product);

      if (!product) {
        errors.push({
          productId: item.product,
          productName: item.name,
          slug: item.slug,
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      if (product.availableStock === 0) {
        errors.push({
          productId: item.product,
          productName: product.name,
          slug: product.slug,
          requested: item.quantity,
          available: 0,
        });
      } else if (product.availableStock < item.quantity) {
        // Có stock nhưng không đủ
        warnings.push({
          productId: item.product,
          productName: product.name,
          oldQuantity: item.quantity,
          newQuantity: product.availableStock,
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        hasErrors: true,
        hasWarnings: false,
        errors,
        warnings: [],
        message: errors.length === 1 ? `${errors[0].productName} is out of stock` : `${errors.length} items in your cart are out of stock`,
      };
    }

    if (warnings.length > 0) {
      return {
        success: false,
        hasErrors: false,
        hasWarnings: true,
        errors: [],
        warnings,
        message: warnings.length === 1 ? `${warnings[0].productName} has limited stock` : `${warnings.length} items have limited stock`,
      };
    }

    return {
      success: true,
      hasErrors: false,
      hasWarnings: false,
      errors: [],
      warnings: [],
      message: "All items are available",
    };
  } catch (error) {
    return {
      success: false,
      hasErrors: true,
      hasWarnings: false,
      errors: [],
      warnings: [],
      message: error instanceof Error ? error.message : "Failed to validate cart",
    };
  }
}

// Sync cart với stock mới nhất (dùng khi có warnings)
export async function syncCartWithLatestStock(items: OrderItem[]) {
  try {
    await connectToDatabase();

    const productIds = items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select("_id availableStock countInStock");

    const stockMap = new Map(products.map((p) => [p._id.toString(), { availableStock: p.availableStock, countInStock: p.countInStock }]));

    const syncedItems = items
      .map((item) => {
        const stock = stockMap.get(item.product);
        if (!stock) return null; // Product không tồn tại -> loại bỏ

        if (stock.availableStock === 0) return null; // Out of stock -> loại bỏ

        return {
          ...item,
          countInStock: stock.availableStock,
          quantity: Math.min(item.quantity, stock.availableStock),
        };
      })
      .filter((item): item is OrderItem => item !== null); // Remove null items

    return {
      success: true,
      items: syncedItems,
      removedCount: items.length - syncedItems.length,
    };
  } catch (error) {
    console.error("Failed to sync cart:", error);
    return {
      success: false,
      items: items,
      removedCount: 0,
    };
  }
}

// scripts/migrate-stock.ts
// Chạy 1 lần để migrate data hiện tại

import { connectToDatabase } from "@/lib/db";
import Product from "@/lib/db/models/product.model";
import Order from "@/lib/db/models/order.model";
import { loadEnvConfig } from "@next/env";
import { cwd } from "process";
loadEnvConfig(cwd());
async function migrateStock() {
  try {
    await connectToDatabase(process.env.MONGODB_URI);

    // 1. Cập nhật tất cả products: availableStock = countInStock, reservedStock = 0
    const updateProducts = await Product.updateMany({}, [
      {
        $set: {
          availableStock: "$countInStock",
          reservedStock: 0,
        },
      },
    ]);

    // console.log(`✅ Updated ${updateProducts.modifiedCount} products`);

    // 2. Cập nhật tất cả orders chưa delivered/cancelled
    const updateOrders = await Order.updateMany(
      {
        isDelivered: false,
        // Thêm điều kiện khác nếu có trường cancelled
      },
      {
        $set: {
          stockStatus: "reserved",
          stockReservedAt: new Date(),
          stockReservationExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 phút
        },
      }
    );

    // console.log(`✅ Updated ${updateOrders.modifiedCount} orders`);

    // 3. Tính toán lại reserved stock dựa trên orders đang pending
    const pendingOrders = await Order.find({
      stockStatus: "reserved",
      isPaid: false,
    });

    for (const order of pendingOrders) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          {
            $inc: {
              availableStock: -item.quantity,
              reservedStock: item.quantity,
            },
          }
        );
      }
    }

    // console.log(`✅ Processed ${pendingOrders.length} pending orders`);
    // console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run migration
migrateStock();

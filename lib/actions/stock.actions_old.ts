import mongoose from "mongoose";
import Product from "@/lib/db/models/product.model";
import Order from "@/lib/db/models/order.model";

const RESERVATION_TIMEOUT_MINUTES = 30;

// Reserve stock khi tạo order
export async function reserveStock(orderId: string) {
  const session = await mongoose.connection.startSession();

  try {
    session.startTransaction();
    const opts = { session };

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");
    if (order.stockStatus !== "reserved") {
      throw new Error("Order stock already processed");
    }

    // Set thời gian hết hạn reservation
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + RESERVATION_TIMEOUT_MINUTES);

    // Reserve stock cho từng item
    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product ${item.name} not found`);

      // Kiểm tra availableStock
      if (product.availableStock < item.quantity) {
        throw new Error(`Not enough stock for ${item.name}. Available: ${product.availableStock}`);
      }

      // Cập nhật stock
      await Product.updateOne(
        { _id: product._id },
        {
          $inc: {
            availableStock: -item.quantity,
            reservedStock: item.quantity,
          },
        },
        opts
      );
    }

    // Cập nhật order
    await Order.updateOne(
      { _id: orderId },
      {
        stockReservedAt: new Date(),
        stockReservationExpiry: expiryDate,
      },
      opts
    );

    await session.commitTransaction();
    return { success: true, expiryDate };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Confirm stock khi thanh toán thành công
export async function confirmStock(orderId: string) {
  const session = await mongoose.connection.startSession();

  try {
    session.startTransaction();
    const opts = { session };

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");
    if (order.stockStatus === "confirmed") {
      return { success: true, message: "Stock already confirmed" };
    }
    if (order.stockStatus === "released") {
      throw new Error("Stock already released, cannot confirm");
    }

    // Chuyển reserved sang sold (trừ countInStock, giảm reservedStock)
    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product ${item.name} not found`);

      await Product.updateOne(
        { _id: product._id },
        {
          $inc: {
            countInStock: -item.quantity,
            reservedStock: -item.quantity,
            numSales: item.quantity,
          },
        },
        opts
      );
    }

    // Cập nhật order status
    await Order.updateOne({ _id: orderId }, { stockStatus: "confirmed" }, opts);

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Release stock khi hủy order hoặc hết hạn
export async function releaseStock(orderId: string, reason: "cancelled" | "expired" = "cancelled") {
  const session = await mongoose.connection.startSession();

  try {
    session.startTransaction();
    const opts = { session };

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");
    if (order.stockStatus === "released") {
      return { success: true, message: "Stock already released" };
    }
    if (order.stockStatus === "confirmed") {
      throw new Error("Cannot release confirmed stock");
    }

    // Trả stock về available
    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) continue; // Skip nếu product đã bị xóa

      await Product.updateOne(
        { _id: product._id },
        {
          $inc: {
            availableStock: item.quantity,
            reservedStock: -item.quantity,
          },
        },
        opts
      );
    }

    // Cập nhật order status
    await Order.updateOne(
      { _id: orderId },
      {
        stockStatus: "released",
        cancelReason: reason,
      },
      opts
    );

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Cron job: Release expired reservations
export async function releaseExpiredReservations() {
  try {
    const expiredOrders = await Order.find({
      stockStatus: "reserved",
      stockReservationExpiry: { $lt: new Date() },
    });

    const results = [];
    for (const order of expiredOrders) {
      try {
        await releaseStock(order._id.toString(), "expired");
        results.push({ orderId: order._id, success: true });
      } catch (error) {
        results.push({ orderId: order._id, success: false, error });
      }
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

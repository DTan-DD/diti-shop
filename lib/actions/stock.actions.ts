/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import Product from "@/lib/db/models/product.model";
import Order from "@/lib/db/models/order.model";
import { acquireOrderLock, releaseOrderLock } from "../redisLock";

const RESERVATION_TIMEOUT_MINUTES = 30;
const MAX_RETRY = 3;

/**
 * Reserve stock khi order được tạo.
 * - Dùng MongoDB transaction để đảm bảo atomic
 * - Retry 3 lần nếu xảy ra WriteConflict
 * - Redis lock để tránh 2 tiến trình xử lý cùng order
 */
export async function reserveStock(orderId: string) {
  if (!(await acquireOrderLock(orderId))) {
    throw new Error("Order is being processed by another request");
  }

  try {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      const session = await mongoose.connection.startSession();
      try {
        session.startTransaction();
        const opts = { session };

        const order = await Order.findById(orderId).session(session);
        if (!order) throw new Error("Order not found");
        if (order.stockStatus !== "reserved") {
          throw new Error("Order stock already processed");
        }

        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + RESERVATION_TIMEOUT_MINUTES);

        // ✅ Reserve từng sản phẩm
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) throw new Error(`Product ${item.name} not found`);

          const available = product.countInStock - product.reservedStock;
          if (available < item.quantity) {
            throw new Error(`Not enough stock for ${item.name}. Available: ${available}`);
          }

          // 🔒 Trừ hàng tạm thời (reserve)
          await Product.updateOne({ _id: product._id }, { $inc: { availableStock: -item.quantity, reservedStock: item.quantity } }, opts);
        }

        // ✅ Cập nhật thông tin order
        await Order.updateOne(
          { _id: orderId },
          {
            stockReservedAt: new Date(),
            stockReservationExpiry: expiryDate,
            stockStatus: "reserved",
          },
          opts
        );

        await session.commitTransaction();
        session.endSession();

        return { success: true, expiryDate };
      } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        // 🔁 Retry nếu conflict
        if (attempt < MAX_RETRY && error?.message && /WriteConflict|TransientTransactionError/i.test(error.message)) {
          console.warn(`Retrying reserveStock() attempt ${attempt} due to conflict`);
          await new Promise((r) => setTimeout(r, attempt * 100)); // exponential backoff
          continue;
        }

        throw error;
      }
    }
  } finally {
    await releaseOrderLock(orderId);
  }
}

/**
 * Xác nhận thanh toán, chuyển hàng từ reserved → sold.
 * - Trừ countInStock (hàng thật)
 * - Giảm reserved
 * - Tăng numSales
 */
export async function confirmStock(orderId: string) {
  if (!(await acquireOrderLock(orderId))) {
    throw new Error("Order is being processed by another request");
  }

  try {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
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

        // ✅ Trừ tồn thật, giảm reserved
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) throw new Error(`Product ${item.name} not found`);

          // Kiểm tra tránh âm tồn (trường hợp dữ liệu lệch)
          if (product.reservedStock < item.quantity) {
            throw new Error(`Invalid reserved stock for ${item.name}`);
          }

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

        // ✅ Cập nhật order
        await Order.updateOne({ _id: orderId }, { stockStatus: "confirmed" }, opts);

        await session.commitTransaction();
        session.endSession();

        return { success: true };
      } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        // Retry nếu conflict
        if (attempt < MAX_RETRY && error?.message && /WriteConflict|TransientTransactionError/i.test(error.message)) {
          console.warn(`Retrying confirmStock() attempt ${attempt}...`);
          await new Promise((r) => setTimeout(r, attempt * 100));
          continue;
        }

        throw error;
      }
    }
  } finally {
    await releaseOrderLock(orderId);
  }
}

/**
 * Giải phóng stock khi order bị hủy hoặc hết hạn.
 * - Giảm reserved
 * - Không hoàn countInStock (vì hàng thật chưa bị trừ)
 * - Nếu product đã bị xóa, bỏ qua
 */
export async function releaseStock(orderId: string, reason: "cancelled" | "expired" = "cancelled") {
  if (!(await acquireOrderLock(orderId))) {
    throw new Error("Order is being processed by another request");
  }

  const MAX_RETRY = 3;

  try {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
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

        // ✅ Hoàn stock (giảm reserved)
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) continue; // Bỏ qua nếu product đã bị xóa

          // Giảm reserved
          await Product.updateOne({ _id: product._id }, { $inc: { availableStock: item.quantity, reservedStock: -item.quantity } }, opts);
        }

        // ✅ Cập nhật order
        await Order.updateOne(
          { _id: orderId },
          {
            stockStatus: "released",
            cancelReason: reason,
          },
          opts
        );

        await session.commitTransaction();
        session.endSession();

        return { success: true };
      } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        if (attempt < MAX_RETRY && error?.message && /WriteConflict|TransientTransactionError/i.test(error.message)) {
          console.warn(`Retrying releaseStock() attempt ${attempt}...`);
          await new Promise((r) => setTimeout(r, attempt * 100));
          continue;
        }

        throw error;
      }
    }
  } finally {
    await releaseOrderLock(orderId);
  }
}

/**
 * Cron job: Release all expired reserved orders.
 * - Quét order quá hạn (stockStatus="reserved" & expiry < now)
 * - Gọi releaseStock() cho từng order
 * - Bỏ qua order đang có Redis lock
 * - Giới hạn batch để tránh quá tải
 */
export async function releaseExpiredReservations(batchSize = 100) {
  try {
    const expiredOrders = await Order.find({
      stockStatus: "reserved",
      stockReservationExpiry: { $lt: new Date() },
    }).limit(batchSize);

    const results: {
      orderId: string;
      success: boolean;
      message?: string;
    }[] = [];

    for (const order of expiredOrders) {
      const orderId = order._id.toString();

      // 🔒 Lock order để tránh xử lý trùng từ cron khác
      const locked = await acquireOrderLock(orderId, 15);
      if (!locked) {
        results.push({ orderId, success: false, message: "Skipped (locked)" });
        continue;
      }

      try {
        await releaseStock(orderId, "expired");
        results.push({ orderId, success: true });
      } catch (error: any) {
        results.push({
          orderId,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await releaseOrderLock(orderId);
      }
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

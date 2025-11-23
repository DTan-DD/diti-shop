import Order from "@/lib/db/models/order.model";
import { inngest } from "./client";
import { connectToDatabase } from "@/lib/db";
import { cancelOrder, cancelOrderInngestVersion } from "@/lib/actions/order.actions";

export const autoCancelOrder = inngest.createFunction(
  { id: "auto-cancel-order" },
  { event: "app/order.created" }, // sẽ trigger khi bạn send event
  async ({ event, step }) => {
    const { orderId, ttlMinutes = 15 } = event.data;

    // 1. Delay tới đúng thời gian
    const expireAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await step.sleepUntil("wait-for-timeout", expireAt);

    // 2. Kết nối DB
    await step.run("connect-db", async () => {
      await connectToDatabase();
    });

    // 3. Check trạng thái đơn
    return await step.run("check-order-status", async () => {
      const order = await Order.findById(orderId);

      if (!order) {
        console.warn(`[Inngest] Order ${orderId} not found.`);
        return { cancelled: false, reason: "not_found" };
      }

      if (order.isPaid) {
        return { cancelled: false, reason: "paid" };
      }

      if (order.isCancelled) {
        return { cancelled: false, reason: "already_cancelled" };
      }

      // 4. Tự động hủy + hoàn stock
      await cancelOrderInngestVersion(orderId);

      order.isCancelled = true;
      await order.save();

      return { cancelled: true };
    });
  }
);

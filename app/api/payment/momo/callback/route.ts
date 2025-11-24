import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Order from "@/lib/db/models/order.model";
import { sendPurchaseReceipt } from "@/emails";
import { revalidatePath } from "next/cache";
import { formatError } from "@/lib/utils";

export async function POST(req: Request) {
  await connectToDatabase();
  const data = await req.json();
  const { orderId, resultCode, amount } = data;

  try {
    const order = await Order.findById(orderId).populate("user", "email");
    if (!order) throw new Error("Order not found");
    if (resultCode === 0 && order.isPaid === false) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult ??= { id: "", status: "", email_address: "", pricePaid: "" };
      order.paymentResult.status = "COMPLETED";
      order.paymentResult.pricePaid = amount.toString();
      order.paymentResult.email_address = typeof order.user === "object" ? (order.user.email?.toString() ?? "") : "";
      order.paymentResult.id = orderId;
      await order.save();
      await sendPurchaseReceipt({ order });

      return NextResponse.json({ success: true, message: "Payment successful" });
    } else {
      order.paymentResult ??= { id: "", status: "", email_address: "", pricePaid: "" };
      order.paymentResult.status = "FAILED";
      await order.save();
      return NextResponse.json({ success: false, message: "Payment failed" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ success: false, message: formatError(error) });
  }
}

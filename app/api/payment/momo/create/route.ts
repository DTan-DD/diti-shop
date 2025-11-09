import crypto from "crypto";
import { NextResponse } from "next/server";
import Order from "@/lib/db/models/order.model";
import { connectToDatabase } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  await connectToDatabase();
  const { orderId } = await req.json();

  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const endpoint = process.env.MOMO_ENDPOINT!;
    const partnerCode = process.env.MOMO_PARTNER_CODE!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const redirectUrl = `${process.env.MOMO_REDIRECT_URL}/account/orders/${orderId}`;
    const ipnUrl = process.env.MOMO_IPN_URL!;

    const requestId = `${order._id}-${Date.now()}`;
    const orderInfo = `Payment for order ${order._id}`;
    // const amount = order.totalPrice.toString();
    const amount = 100000;
    const orderIdMomo = order._id.toString();
    const requestType = "payWithMethod";

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderIdMomo}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const body = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount: 100000,
      orderId: orderIdMomo,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData: "",
      signature,
      lang: "vi",
    });

    console.log(body);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await response.json();

    if (data.resultCode === 0) {
      // Lưu tạm transactionId
      order.paymentResult = {
        id: data.transId,
        status: "PENDING",
        pricePaid: "0",
        email_address: "",
      };
      await order.save();

      return NextResponse.json({ success: true, payUrl: data.payUrl });
    } else {
      return NextResponse.json({ success: false, message: data.message });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error });
  }
}

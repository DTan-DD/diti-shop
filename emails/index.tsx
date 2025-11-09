import { Resend } from "resend";
import PurchaseReceiptEmail from "./purchase-receipt";
import { IOrder } from "@/lib/db/models/order.model";
import AskReviewOrderItemsEmail from "./ask-review-order-items";
import { SENDER_EMAIL, SENDER_NAME } from "@/lib/constants";
import OTPVerificationEmail from "./otp-verification";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const sendPurchaseReceipt = async ({ order }: { order: IOrder }) => {
  await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: (order.user as { email: string }).email,
    subject: "Order Confirmation",
    react: <PurchaseReceiptEmail order={order} />,
  });
};

export const sendAskReviewOrderItems = async ({ order }: { order: IOrder }) => {
  const oneDayFromNow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: (order.user as { email: string }).email,
    subject: "Review your order items",
    react: <AskReviewOrderItemsEmail order={order} />,
    scheduledAt: oneDayFromNow,
  });
};

export const sendOTPEmail = async ({ email, otp, userName }: { email: string; otp: string; userName: string }) => {
  try {
    await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: email,
      subject: "Mã xác thực OTP đăng ký tài khoản",
      react: <OTPVerificationEmail otp={otp} userName={userName} />,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

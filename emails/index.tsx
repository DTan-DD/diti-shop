import { Resend } from "resend";
import PurchaseReceiptEmail from "./purchase-receipt";
import { IOrder } from "@/lib/db/models/order.model";
import AskReviewOrderItemsEmail from "./ask-review-order-items";
import { SENDER_EMAIL, SENDER_NAME } from "@/lib/constants";
import OTPVerificationEmail from "./otp-verification";
import { renderEmailComponent } from "@/lib/email-renderer";
import ChangeEmailOTPEmail from "./change-email-otp";
import ChangeEmailSecurityAlertEmail from "./alert-change-email";
import { SendChangeEmailAlertProps } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const sendPurchaseReceipt2 = async ({ order }: { order: IOrder }) => {
  await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: (order.user as { email: string }).email,
    subject: "Order Confirmation",
    react: <PurchaseReceiptEmail order={order} />,
  });
};

export const sendAskReviewOrderItems2 = async ({ order }: { order: IOrder }) => {
  const oneDayFromNow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: (order.user as { email: string }).email,
    subject: "Review your order items",
    react: <AskReviewOrderItemsEmail order={order} />,
    scheduledAt: oneDayFromNow,
  });
};

export const sendOTPEmail2 = async ({ email, otp, userName }: { email: string; otp: string; userName: string }) => {
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

export const sendOTPEmail = async ({ email, otp, userName }: { email: string; otp: string; userName: string }) => {
  try {
    const emailHtml = await renderEmailComponent(<OTPVerificationEmail otp={otp} userName={userName} />);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        subject: "Mã xác thực OTP đăng ký tài khoản",
        htmlContent: emailHtml,
      }),
    });

    console.log(response);
    const text = await response.text();
    console.log(response.status, response.statusText, text);
    if (!response.ok) {
      throw new Error("Brevo API error");
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

export const sendPurchaseReceipt = async ({ order }: { order: IOrder }) => {
  try {
    const emailHtml = renderEmailComponent(<PurchaseReceiptEmail order={order} />);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: (order.user as { email: string }).email }],
        subject: "Order Confirmation",
        htmlContent: emailHtml,
      }),
    });

    if (!response.ok) throw new Error("Brevo API error");
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

export const sendAskReviewOrderItems = async ({ order }: { order: IOrder }) => {
  try {
    const emailHtml = renderEmailComponent(<AskReviewOrderItemsEmail order={order} />);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: (order.user as { email: string }).email }],
        subject: "Review your order items",
        htmlContent: emailHtml,
      }),
    });

    if (!response.ok) throw new Error("Brevo API error");
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

export const sendChangeEmailOTP2 = async ({ email, otp, userName, oldEmail, newEmail }: { email: string; otp: string; userName: string; oldEmail: string; newEmail: string }) => {
  try {
    // Send to both old and new email for security
    await Promise.all([
      resend.emails.send({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: email,
        subject: "Xác thực thay đổi email",
        react: <ChangeEmailOTPEmail otp={otp} userName={userName} oldEmail={oldEmail} newEmail={newEmail} />,
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Error sending change email OTP:", error);
    return { success: false, error: "Failed to send email" };
  }
};

export const sendChangeEmailOTP = async ({ email, otp, userName, oldEmail, newEmail }: { email: string; otp: string; userName: string; oldEmail: string; newEmail: string }) => {
  try {
    const emailHtml = await renderEmailComponent(<ChangeEmailOTPEmail otp={otp} userName={userName} oldEmail={oldEmail} newEmail={newEmail} />);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        subject: "Xác thực thay đổi email",
        htmlContent: emailHtml,
      }),
    });

    if (!response.ok) throw new Error("Brevo API error");
    return { success: true };
  } catch (error) {
    console.error("Error sending change email OTP:", error);
    return { success: false, error: "Failed to send email" };
  }
};

/**
 * Gửi cảnh báo bảo mật tới email cũ khi user thay đổi email
 */
export const sendChangeEmailSecurityAlert = async ({ oldEmail, newEmail, userName, actionTime }: SendChangeEmailAlertProps) => {
  try {
    const emailHtml = await renderEmailComponent(<ChangeEmailSecurityAlertEmail userName={userName} oldEmail={oldEmail} newEmail={newEmail} actionTime={actionTime} />);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: oldEmail }],
        subject: "⚠️ Cảnh báo bảo mật: Email tài khoản vừa thay đổi",
        htmlContent: emailHtml,
      }),
    });

    if (!response.ok) throw new Error("Brevo API error");
    return { success: true };
  } catch (error) {
    console.error("Error sending change email security alert:", error);
    return { success: false, error: "Failed to send alert email" };
  }
};

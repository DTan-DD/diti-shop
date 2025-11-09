"use server";

import { headers } from "next/headers";
import { OTPService } from "@/lib/actions/otp.service";
import { sendOTPEmail } from "@/emails/index";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";

export async function sendOTPAction(email: string, name: string) {
  try {
    // Get IP address
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

    // Check if email already exists
    await connectToDatabase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        success: false,
        message: "Email đã được đăng ký. Vui lòng đăng nhập.",
      };
    }

    // Check rate limit
    const rateLimit = await OTPService.checkSendRateLimit(email, ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.message,
      };
    }

    // Generate and save OTP
    const otp = OTPService.generateOTP();
    await OTPService.saveOTP(email, otp);

    // Send email
    const emailResult = await sendOTPEmail({ email, otp, userName: name });
    console.log(emailResult);
    if (!emailResult.success) {
      console.error("Error sending email:", emailResult.error);
      return {
        success: false,
        message: "Không thể gửi email. Vui lòng thử lại.",
      };
    }

    console.log("OTP sent successfully", email);
    return {
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn.",
    };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return {
      success: false,
      message: "Có lỗi xảy ra. Vui lòng thử lại.",
    };
  }
}

export async function verifyOTPAction(email: string, otp: string) {
  try {
    const result = await OTPService.verifyOTP(email, otp);
    return result;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return {
      success: false,
      message: "Có lỗi xảy ra. Vui lòng thử lại.",
    };
  }
}

export async function resendOTPAction(email: string, name: string) {
  // Same as sendOTPAction but clear existing OTP first
  return sendOTPAction(email, name);
}

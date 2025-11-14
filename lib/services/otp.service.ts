// "use server";

import redis from "@/lib/db/redis";
import { OTP_CONFIG } from "@/lib/constants";

export class OTPService {
  // Generate 6-digit OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Save OTP to Redis with expiry
  static async saveOTP(email: string, otp: string): Promise<void> {
    const key = `otp:${email}`;
    const expirySeconds = OTP_CONFIG.EXPIRY_MINUTES * 60;

    await redis.setex(
      key,
      expirySeconds,
      JSON.stringify({
        otp,
        attempts: 0,
        createdAt: Date.now(),
      })
    );
  }

  // Verify OTP
  static async verifyOTP(
    email: string,
    inputOTP: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Check if email is locked
    const lockKey = `otp:lock:${email}`;
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      return {
        success: false,
        message: "Tài khoản tạm khóa do nhập sai quá nhiều. Vui lòng thử lại sau 30 phút.",
      };
    }

    // Get OTP data
    const key = `otp:${email}`;
    const data = await redis.get(key);

    if (!data) {
      return {
        success: false,
        message: "OTP không tồn tại hoặc đã hết hạn. Vui lòng gửi lại OTP.",
      };
    }

    const otpData = JSON.parse(data);

    // Check if OTP matches
    if (otpData.otp !== inputOTP) {
      otpData.attempts += 1;

      // Lock if too many attempts
      if (otpData.attempts >= OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
        await redis.setex(lockKey, OTP_CONFIG.LOCKOUT_MINUTES * 60, "1");
        await redis.del(key);
        return {
          success: false,
          message: `Bạn đã nhập sai ${OTP_CONFIG.MAX_VERIFY_ATTEMPTS} lần. Tài khoản tạm khóa 30 phút.`,
        };
      }

      // Update attempts
      await redis.setex(key, OTP_CONFIG.EXPIRY_MINUTES * 60, JSON.stringify(otpData));

      return {
        success: false,
        message: `OTP không đúng. Còn ${OTP_CONFIG.MAX_VERIFY_ATTEMPTS - otpData.attempts} lần thử.`,
      };
    }

    // Success - delete OTP
    await redis.del(key);
    return {
      success: true,
      message: "Xác thực thành công!",
    };
  }

  // Check rate limit for sending OTP
  static async checkSendRateLimit(email: string, ip: string): Promise<{ allowed: boolean; message?: string }> {
    const emailKey = `otp:send:${email}`;
    const ipKey = `otp:send:${ip}`;
    const ttl = OTP_CONFIG.RATE_LIMIT_WINDOW * 60;

    // Check email rate limit
    const emailCount = await redis.get(emailKey);
    if (emailCount && parseInt(emailCount) >= OTP_CONFIG.MAX_SEND_PER_EMAIL) {
      return {
        allowed: false,
        message: `Bạn đã gửi quá nhiều OTP. Vui lòng thử lại sau ${OTP_CONFIG.RATE_LIMIT_WINDOW} phút.`,
      };
    }

    // Check IP rate limit
    const ipCount = await redis.get(ipKey);
    if (ipCount && parseInt(ipCount) >= OTP_CONFIG.MAX_SEND_PER_IP) {
      return {
        allowed: false,
        message: "Quá nhiều yêu cầu từ địa chỉ này. Vui lòng thử lại sau.",
      };
    }

    // Increment counters
    if (emailCount) {
      await redis.incr(emailKey);
    } else {
      await redis.setex(emailKey, ttl, "1");
    }

    if (ipCount) {
      await redis.incr(ipKey);
    } else {
      await redis.setex(ipKey, ttl, "1");
    }

    return { allowed: true };
  }

  // Get remaining time for OTP
  static async getOTPExpiry(email: string): Promise<number> {
    const key = `otp:${email}`;
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
}

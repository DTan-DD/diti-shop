export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "NxtAmzn";
export const APP_SLOGAN = process.env.NEXT_PUBLIC_APP_SLOGAN || "Spend less, enjoy more.";
export const APP_DESCRIPTION = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "An Amazon clone built with Next.js and MongoDB";
export const PAGE_SIZE = Number(process.env.PAGE_SIZE || 9);
export const FREE_SHIPPING_MIN_PRICE = Number(process.env.FREE_SHIPPING_MIN_PRICE || 35);
export const APP_COPYRIGHT = process.env.NEXT_PUBLIC_APP_COPYRIGHT || `Copyright © 2025 ${APP_NAME}. All rights reserved.`;
export const AVAILABLE_PAYMENT_METHODS = [
  {
    name: "MoMo",
    commission: 0,
    isDefault: true,
  },
  {
    name: "PayPal",
    commission: 0,
    isDefault: true,
  },
  {
    name: "Stripe",
    commission: 0,
    isDefault: true,
  },
  {
    name: "Cash On Delivery",
    commission: 0,
    isDefault: true,
  },
];
export const DEFAULT_PAYMENT_METHOD = process.env.DEFAULT_PAYMENT_METHOD || "PayPal";

export const AVAILABLE_DELIVERY_DATES = [
  {
    name: "Tomorrow",
    daysToDeliver: 1,
    shippingPrice: 12.9,
    freeShippingMinPrice: 0,
  },
  {
    name: "Next 3 Days",
    daysToDeliver: 3,
    shippingPrice: 6.9,
    freeShippingMinPrice: 0,
  },
  {
    name: "Next 5 Days",
    daysToDeliver: 5,
    shippingPrice: 4.9,
    freeShippingMinPrice: 35,
  },
];

export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

export const SENDER_EMAIL = process.env.SENDER_EMAIL || "onboarding@resend.dev";
export const SENDER_NAME = process.env.SENDER_NAME || "test";
export const RESEND_API_KEY = process.env.RESEND_API_KEY || "ll";

// export const USER_ROLES = ["Admin", "User"];

// export const SENDER_NAME = process.env.SENDER_NAME || "support";
// export const SENDER_EMAIL = process.env.SENDER_EMAIL || "onboarding@resend.dev";

export const USER_ROLES = ["Admin", "User"];
export const COLORS = ["Gold", "Green", "Red"];
export const THEMES = ["Light", "Dark", "System"];

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_SEND_PER_EMAIL: 50,
  MAX_SEND_PER_IP: 100,
  MAX_VERIFY_ATTEMPTS: 50,
  LOCKOUT_MINUTES: 2,
  RATE_LIMIT_WINDOW: 2, // 1 hour in minutes
};

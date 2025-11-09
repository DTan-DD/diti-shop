/**
 * Test gửi email bằng Resend
 * Chạy bằng:  npx tsx scripts/test-resend.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // 👈 ép load file .env.local
import { APP_NAME, RESEND_API_KEY } from "@/lib/constants";
import { Resend } from "resend";

// 🧩 Lấy biến môi trường
console.log(process.env.RESEND_API_KEY);
console.log(process.env.SENDER_EMAIL);
console.log(RESEND_API_KEY);
console.log(APP_NAME);
const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.SENDER_EMAIL || "diti-shop@resend.dev";
const SENDER_NAME = process.env.SENDER_NAME || "DiTi Shop";

// 🧪 Hàm test
async function testSendEmail() {
  try {
    console.log("🚀 Starting test email send...");

    const result = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: "tan.ddd03979@gmail.com", // 👉 đổi thành email thật của bạn
      subject: "Test Resend Email",
      html: `
        <h1>Hello from Resend 👋</h1>
        <p>This is a test email sent from Node.js using the Resend API.</p>
        <p><b>Time:</b> ${new Date().toLocaleString()}</p>
      `,
    });

    console.log("📧 Email send result:");
    console.dir(result, { depth: null });
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

// testSendEmail();

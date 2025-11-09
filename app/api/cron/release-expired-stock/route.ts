import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/actions/stock.actions";
import { connectToDatabase } from "@/lib/db";

// Cron job endpoint - chạy mỗi 10 phút
// Vercel Cron: */10 * * * *
// Hoặc dùng external service như cron-job.org

export async function GET(request: NextRequest) {
  try {
    // Security: Kiểm tra authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const result = await releaseExpiredReservations(50);

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Cho phép gọi POST để test manually
export async function POST(request: NextRequest) {
  return GET(request);
}

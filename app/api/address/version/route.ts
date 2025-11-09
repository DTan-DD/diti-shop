// app/api/address/version/route.ts
import { NextResponse } from "next/server";
import redis from "@/lib/db/redis";
import Setting from "@/lib/db/models/setting.model";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    await connectToDatabase();

    // const cacheKey = "addressVersion";
    // const cached = await redis.get(cacheKey);
    // if (cached) {
    //   return NextResponse.json({ version: cached });
    // }

    // Try to read from Setting.common.addressVersion
    const setting = await Setting.findOne({}, { "common.addressVersion": 1 }).lean();
    const version = setting?.common?.addressVersion || "v1.0.0";

    // await redis.set(cacheKey, version, "EX", 30 * 60 * 60 * 24);
    return NextResponse.json({ version });
  } catch (error) {
    console.error("GET /api/address/version error:", error);
    return NextResponse.json({ error: "Failed to fetch version" }, { status: 500 });
  }
}

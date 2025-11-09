// app/api/address/route.ts
import { NextResponse } from "next/server";
import Province from "@/lib/db/models/province.model";
import redis from "@/lib/db/redis";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    await connectToDatabase();

    const cacheKey = "provinces";
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    const provinces = await Province.find().lean();
    // set cache (24h)
    await redis.set(cacheKey, JSON.stringify(provinces), "EX", 60 * 60 * 24);
    return NextResponse.json(provinces);
  } catch (error) {
    console.error("GET /api/address error:", error);
    return NextResponse.json({ error: "Failed to fetch provinces" }, { status: 500 });
  }
}

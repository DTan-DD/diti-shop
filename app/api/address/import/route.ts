import { NextResponse } from "next/server";
import Province from "@/lib/db/models/province.model";
import redis from "@/lib/db/redis";
import Setting from "@/lib/db/models/setting.model";
import { connectToDatabase } from "@/lib/db";
import { IDistrict, IProvince, IWard } from "@/types";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { provinces } = await req.json();

    if (!provinces || !Array.isArray(provinces)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const cleanedData = provinces.map((province: IProvince) => ({
      ...province,
      Districts: (province.Districts || []).map((district: IDistrict) => ({
        ...district,
        Wards: (district.Wards || []).filter((ward: IWard) => ward && typeof ward === "object" && "Id" in ward && "Name" in ward),
      })),
    }));
    await Province.deleteMany();
    await Province.insertMany(cleanedData);

    // Tăng version
    const version = "v" + Date.now();
    await Setting.updateOne({}, { "common.addressVersion": version });

    // Clear cache Redis
    await redis.del("provinces");
    await redis.set("addressVersion", version);

    return NextResponse.json({ message: "Imported address data successfully", version });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}

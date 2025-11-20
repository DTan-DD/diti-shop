/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

mongoose.set("strictQuery", false);

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Lưu cache trong global để tránh bị reset trên mỗi serverless run
let cached = (globalThis as any).mongoose as Cached;

if (!cached) {
  cached = (globalThis as any).mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectToDatabase = async (MONGODB_URI = process.env.MONGODB_URI) => {
  if (cached.conn) {
    // console.log("⚡ Using existing mongoose connection");
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI is missing");
  }

  if (!cached.promise) {
    // console.log("🔌 Creating new mongoose connection…");
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

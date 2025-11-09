// lib/utils/redisLock.ts
import redis from "@/lib/db/redis";

/**
 * Type định nghĩa các loại lock có thể dùng.
 */
export type LockType = "order" | "user" | "product";

/**
 * Tạo key lock chuẩn hóa.
 * @param type - Loại lock (order, user, product)
 * @param id - ID định danh
 * @returns Redis key, ví dụ: lock:order:123
 */
export function makeLockKey(type: LockType, id: string): string {
  return `lock:${type}:${id}`;
}

/**
 * Hàm generic để acquire lock trên Redis.
 * @param key - Redis key
 * @param ttlSeconds - Thời gian tồn tại (default: 15s)
 * @returns true nếu lock thành công, false nếu đã có lock
 */
export async function acquireLock(key: string, ttlSeconds = 15): Promise<boolean> {
  try {
    const result = await redis.set(key, "1", "EX", ttlSeconds);

    return result === "OK";
  } catch (error) {
    console.error("Redis acquireLock error:", error);
    return false;
  }
}

/**
 * Hàm generic để release lock trên Redis.
 * @param key - Redis key
 */
export async function releaseLock(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis releaseLock error:", error);
  }
}

/**
 * Helper dành riêng cho Order.
 */
export async function acquireOrderLock(orderId: string, ttlSeconds = 20) {
  return acquireLock(makeLockKey("order", orderId), ttlSeconds);
}

export async function releaseOrderLock(orderId: string) {
  return releaseLock(makeLockKey("order", orderId));
}

/**
 * Helper dành riêng cho User (ngăn double-click khi tạo order).
 */
export async function acquireUserLock(userId: string, ttlSeconds = 10) {
  return acquireLock(makeLockKey("user", userId), ttlSeconds);
}

export async function releaseUserLock(userId: string) {
  return releaseLock(makeLockKey("user", userId));
}

/**
 * Helper dành riêng cho Product (tùy chọn nếu sau này cần lock sản phẩm khi chỉnh sửa tồn kho).
 */
export async function acquireProductLock(productId: string, ttlSeconds = 25) {
  return acquireLock(makeLockKey("product", productId), ttlSeconds);
}

export async function releaseProductLock(productId: string) {
  return releaseLock(makeLockKey("product", productId));
}

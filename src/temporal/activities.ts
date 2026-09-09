import axios from "axios";
import type { SupplierHotelRaw, BestOfferHotel } from "../types/hotel.js";
import { saveHotelsToRedis } from "../services/redis.js";
import { SUPPLIER_A_DATA, SUPPLIER_B_DATA } from "../mock/suppliers.js";

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * Activity: Fetch hotels from Supplier A via HTTP (with local memory fallback)
 */
export async function fetchSupplierAActivity(city?: string): Promise<SupplierHotelRaw[]> {
  const url = `${API_BASE_URL}/supplierA/hotels${city ? `?city=${encodeURIComponent(city)}` : ""}`;
  console.log(`[Temporal Activity] Fetching from Supplier A: ${url}`);
  try {
    const res = await axios.get<SupplierHotelRaw[]>(url, { timeout: 3000 });
    console.log(`[Temporal Activity] Supplier A returned ${res.data.length} hotels.`);
    return res.data;
  } catch (error) {
    console.log(`[Temporal Activity] Using direct mock dataset for Supplier A`);
    const c = city?.trim().toLowerCase();
    if (!c) return SUPPLIER_A_DATA;
    return SUPPLIER_A_DATA.filter((h) => h.city.toLowerCase() === c);
  }
}

/**
 * Activity: Fetch hotels from Supplier B via HTTP (with local memory fallback)
 */
export async function fetchSupplierBActivity(city?: string): Promise<SupplierHotelRaw[]> {
  const url = `${API_BASE_URL}/supplierB/hotels${city ? `?city=${encodeURIComponent(city)}` : ""}`;
  console.log(`[Temporal Activity] Fetching from Supplier B: ${url}`);
  try {
    const res = await axios.get<SupplierHotelRaw[]>(url, { timeout: 3000 });
    console.log(`[Temporal Activity] Supplier B returned ${res.data.length} hotels.`);
    return res.data;
  } catch (error) {
    console.log(`[Temporal Activity] Using direct mock dataset for Supplier B`);
    const c = city?.trim().toLowerCase();
    if (!c) return SUPPLIER_B_DATA;
    return SUPPLIER_B_DATA.filter((h) => h.city.toLowerCase() === c);
  }
}

/**
 * Activity: Deduplicate hotels by name, choosing the cheaper price
 */
export async function deduplicateAndSelectBestPriceActivity(
  supplierAData: SupplierHotelRaw[],
  supplierBData: SupplierHotelRaw[]
): Promise<BestOfferHotel[]> {
  console.log(
    `[Temporal Activity] Deduplicating & comparing ${supplierAData.length} (A) and ${supplierBData.length} (B) hotels...`
  );

  const bestOfferMap = new Map<string, BestOfferHotel>();

  // Helper to process list
  const processHotels = (hotels: SupplierHotelRaw[], supplierName: "Supplier A" | "Supplier B") => {
    for (const h of hotels) {
      const key = h.name.trim().toLowerCase();
      const existing = bestOfferMap.get(key);

      if (!existing || h.price < existing.price) {
        bestOfferMap.set(key, {
          name: h.name,
          price: h.price,
          supplier: supplierName,
          commissionPct: h.commissionPct,
        });
      }
    }
  };

  processHotels(supplierAData, "Supplier A");
  processHotels(supplierBData, "Supplier B");

  const results = Array.from(bestOfferMap.values());
  console.log(`[Temporal Activity] Deduplication complete: ${results.length} unique best offers.`);
  return results;
}

/**
 * Activity: Persist deduplicated hotels into Redis Sorted Set for price filtering
 */
export async function saveHotelsToRedisActivity(city: string, hotels: BestOfferHotel[]): Promise<void> {
  console.log(`[Temporal Activity] Persisting ${hotels.length} hotels into Redis for city "${city}"...`);
  await saveHotelsToRedis(city, hotels);
}

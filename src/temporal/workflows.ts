import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities.js";
import type { BestOfferHotel } from "../types/hotel.js";

const {
  fetchSupplierAActivity,
  fetchSupplierBActivity,
  deduplicateAndSelectBestPriceActivity,
  saveHotelsToRedisActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    maximumAttempts: 3,
  },
});

/**
 * Temporal Workflow: Orchestrates parallel supplier fetches, price deduplication, and Redis caching
 */
export async function hotelOfferOrchestratorWorkflow(city: string): Promise<BestOfferHotel[]> {
  // 1. Call Supplier A and Supplier B in parallel
  const [supplierAData, supplierBData] = await Promise.all([
    fetchSupplierAActivity(city),
    fetchSupplierBActivity(city),
  ]);

  // 2. Deduplicate hotels by name, selecting the cheaper price for overlaps
  const bestOffers = await deduplicateAndSelectBestPriceActivity(supplierAData, supplierBData);

  // 3. Save deduplicated list to Redis for price filtering & fast caching
  if (city) {
    await saveHotelsToRedisActivity(city, bestOffers);
  }

  // 4. Return final deduplicated list
  return bestOffers;
}

import { Connection, Client } from "@temporalio/client";
import { hotelOfferOrchestratorWorkflow } from "./workflows.js";
import { TASK_QUEUE } from "./constants.js";
import type { BestOfferHotel } from "../types/hotel.js";
import {
  fetchSupplierAActivity,
  fetchSupplierBActivity,
  deduplicateAndSelectBestPriceActivity,
  saveHotelsToRedisActivity,
} from "./activities.js";

let clientInstance: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (!clientInstance) {
    const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
    const namespace = process.env.TEMPORAL_NAMESPACE || "default";
    const connection = await Connection.connect({ address });
    clientInstance = new Client({
      connection,
      namespace,
    });
  }
  return clientInstance;
}

/**
 * Execute the hotel orchestration workflow via Temporal with automatic fallback for standalone local mode
 */
export async function runHotelOfferWorkflow(
  city: string
): Promise<{ hotels: BestOfferHotel[]; workflowId?: string; engine: "temporal" | "direct_fallback" }> {
  const workflowId = `hotel-orchestrator-${city.toLowerCase()}-${Date.now()}`;

  try {
    const client = await getTemporalClient();
    console.log(`[Temporal Client] Dispatching workflow "${workflowId}" on queue "${TASK_QUEUE}"...`);

    const handle = await client.workflow.start(hotelOfferOrchestratorWorkflow, {
      args: [city],
      taskQueue: TASK_QUEUE,
      workflowId,
    });

    const hotels = await handle.result();
    return {
      hotels,
      workflowId: handle.workflowId,
      engine: "temporal",
    };
  } catch (error) {
    console.warn(
      `[Temporal Client] Temporal execution unreachable (${(error as Error).message}). Executing directly with Redis save.`
    );

    // Direct fallback (same activity steps)
    const [supplierAData, supplierBData] = await Promise.all([
      fetchSupplierAActivity(city),
      fetchSupplierBActivity(city),
    ]);
    const hotels = await deduplicateAndSelectBestPriceActivity(supplierAData, supplierBData);
    await saveHotelsToRedisActivity(city, hotels);

    return {
      hotels,
      engine: "direct_fallback",
    };
  }
}

import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import { mockSuppliersRouter } from "./mock/suppliers.js";
import { runHotelOfferWorkflow } from "./temporal/client.js";
import { getHotelsFromRedisByPriceRange, checkRedisHealth } from "./services/redis.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ----------------------------------------------------------------------------
// Mock Supplier Endpoints: /supplierA/hotels and /supplierB/hotels
// ----------------------------------------------------------------------------
app.use("/", mockSuppliersRouter);

// ----------------------------------------------------------------------------
// Main Orchestration Endpoint: GET /api/hotels?city=delhi&minPrice=...&maxPrice=...
// ----------------------------------------------------------------------------
app.get("/api/hotels", async (req: Request, res: Response) => {
  const city = (req.query.city as string | undefined)?.trim();
  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;

  if (!city) {
    return res.status(400).json({
      error: "City parameter is required (e.g., /api/hotels?city=delhi)",
    });
  }

  try {
    // If price filter is provided, query Redis directly via ZRANGEBYSCORE
    const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;

    if (hasPriceFilter) {
      // Check if Redis has the data for this city; if not, trigger workflow first
      let cachedResults = await getHotelsFromRedisByPriceRange(city, minPrice, maxPrice);

      if (cachedResults === null) {
        console.log(`[API] Cache miss for city "${city}". Triggering Temporal workflow...`);
        await runHotelOfferWorkflow(city);
        cachedResults = await getHotelsFromRedisByPriceRange(city, minPrice, maxPrice);
      }

      return res.json(cachedResults || []);
    }

    // Default flow: Trigger Temporal orchestration workflow
    const result = await runHotelOfferWorkflow(city);
    return res.json(result.hotels);
  } catch (error) {
    console.error(`[API] Error processing /api/hotels: ${(error as Error).message}`);
    return res.status(500).json({
      error: "Internal Server Error during hotel offer orchestration",
      message: (error as Error).message,
    });
  }
});

// ----------------------------------------------------------------------------
// Bonus: Health Check Endpoint: GET /health
// ----------------------------------------------------------------------------
app.get("/health", async (req: Request, res: Response) => {
  const baseUrl = `http://localhost:${PORT}`;

  // Check Supplier A
  let supplierAHealth: { status: "UP" | "DOWN"; latencyMs?: number; error?: string } = { status: "DOWN" };
  const startA = Date.now();
  try {
    await axios.get(`${baseUrl}/supplierA/hotels?city=delhi`, { timeout: 2000 });
    supplierAHealth = { status: "UP", latencyMs: Date.now() - startA };
  } catch (err) {
    supplierAHealth = { status: "DOWN", error: (err as Error).message };
  }

  // Check Supplier B
  let supplierBHealth: { status: "UP" | "DOWN"; latencyMs?: number; error?: string } = { status: "DOWN" };
  const startB = Date.now();
  try {
    await axios.get(`${baseUrl}/supplierB/hotels?city=delhi`, { timeout: 2000 });
    supplierBHealth = { status: "UP", latencyMs: Date.now() - startB };
  } catch (err) {
    supplierBHealth = { status: "DOWN", error: (err as Error).message };
  }

  // Check Redis
  const redisHealthResult = await checkRedisHealth();
  const redisHealth = {
    status: redisHealthResult.status === "healthy" ? "UP" : "DOWN",
    latencyMs: redisHealthResult.latencyMs,
    error: redisHealthResult.error,
  };

  const isHealthy =
    supplierAHealth.status === "UP" &&
    supplierBHealth.status === "UP" &&
    redisHealth.status === "UP";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "HEALTHY" : "DEGRADED",
    timestamp: new Date().toISOString(),
    services: {
      supplierA: supplierAHealth,
      supplierB: supplierBHealth,
      redis: redisHealth,
    },
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Hotel Offer Orchestrator API listening on http://localhost:${PORT}`);
  console.log(`[Server] Available endpoints:`);
  console.log(`  - GET /api/hotels?city=delhi`);
  console.log(`  - GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000`);
  console.log(`  - GET /supplierA/hotels`);
  console.log(`  - GET /supplierB/hotels`);
  console.log(`  - GET /health`);
});

export default app;

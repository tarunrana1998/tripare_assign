import { Router, type Request, type Response } from "express";

// ============================================================================
// Types
// ============================================================================

export interface Supplier1Hotel {
  id: string;
  name: string;
  place: string;
  price: number;
}

export interface Supplier2Hotel {
  id: string;
  name: string;
  place: string;
  price: number;
}

// ============================================================================
// Mock Data
// ============================================================================

export const MOCK_SUPPLIER_1_HOTELS: Supplier1Hotel[] = [
  { id: "s1-1", name: "Grand Palace Hotel", place: "Paris", price: 250 },
  { id: "s1-2", name: "Skyline Suites", place: "Tokyo", price: 180 },
  { id: "s1-3", name: "Central Park Inn", place: "New York", price: 220 },
  { id: "s1-4", name: "Thames View Hotel", place: "London", price: 190 },
  { id: "s1-5", name: "Beachside Resort", place: "Goa", price: 110 },
];

export const MOCK_SUPPLIER_2_HOTELS: Supplier2Hotel[] = [
  { id: "s2-1", name: "Grand Palace Hotel", place: "Paris", price: 235 },
  { id: "s2-2", name: "Tokyo Bay Hotel", place: "Tokyo", price: 195 },
  { id: "s2-3", name: "Central Park Inn", place: "New York", price: 210 },
  { id: "s2-4", name: "London Bridge Hotel", place: "London", price: 175 },
  { id: "s2-5", name: "Ocean Breeze Stay", place: "Goa", price: 125 },
];

// ============================================================================
// Async Service Functions
// ============================================================================

export async function fetchSupplier1Hotels(place?: string): Promise<Supplier1Hotel[]> {
  if (!place) return MOCK_SUPPLIER_1_HOTELS;
  const query = place.toLowerCase();
  return MOCK_SUPPLIER_1_HOTELS.filter((h) => h.place.toLowerCase().includes(query));
}

export async function fetchSupplier2Hotels(place?: string): Promise<Supplier2Hotel[]> {
  if (!place) return MOCK_SUPPLIER_2_HOTELS;
  const query = place.toLowerCase();
  return MOCK_SUPPLIER_2_HOTELS.filter((h) => h.place.toLowerCase().includes(query));
}

// ============================================================================
// Express Router
// ============================================================================

export const mockSuppliersRouter = Router();

// GET /api/suppliers/supplier-1/hotels?place=Paris
mockSuppliersRouter.get("/supplier-1/hotels", async (req: Request, res: Response) => {
  const { place } = req.query;
  const hotels = await fetchSupplier1Hotels(place as string | undefined);
  res.json({ supplier: "Supplier 1", hotels });
});

// GET /api/suppliers/supplier-2/hotels?place=Paris
mockSuppliersRouter.get("/supplier-2/hotels", async (req: Request, res: Response) => {
  const { place } = req.query;
  const hotels = await fetchSupplier2Hotels(place as string | undefined);
  res.json({ supplier: "Supplier 2", hotels });
});

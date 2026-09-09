import { Router, type Request, type Response } from "express";
import type { SupplierHotelRaw } from "../types/hotel.js";

export const SUPPLIER_A_DATA: SupplierHotelRaw[] = [
  {
    hotelId: "a1",
    name: "Holtin",
    price: 6000,
    city: "delhi",
    commissionPct: 10,
  },
  {
    hotelId: "a2",
    name: "Radison",
    price: 5900,
    city: "delhi",
    commissionPct: 13,
  },
  {
    hotelId: "a3",
    name: "Taj Palace",
    price: 12000,
    city: "delhi",
    commissionPct: 15,
  },
  {
    hotelId: "a4",
    name: "Marriott Aerocity",
    price: 8500,
    city: "delhi",
    commissionPct: 12,
  },
  {
    hotelId: "a5",
    name: "The Oberoi",
    price: 14500,
    city: "delhi",
    commissionPct: 18,
  },
  {
    hotelId: "a6",
    name: "Hyatt Regency",
    price: 7200,
    city: "mumbai",
    commissionPct: 10,
  },
  {
    hotelId: "a7",
    name: "Trident Bandra",
    price: 9500,
    city: "mumbai",
    commissionPct: 14,
  },
];

export const SUPPLIER_B_DATA: SupplierHotelRaw[] = [
  {
    hotelId: "b1",
    name: "Holtin",
    price: 5340,
    city: "delhi",
    commissionPct: 20,
  },
  {
    hotelId: "b2",
    name: "Radison",
    price: 6100,
    city: "delhi",
    commissionPct: 15,
  },
  {
    hotelId: "b3",
    name: "Taj Palace",
    price: 11800,
    city: "delhi",
    commissionPct: 12,
  },
  {
    hotelId: "b4",
    name: "Leela Palace",
    price: 9200,
    city: "delhi",
    commissionPct: 16,
  },
  {
    hotelId: "b5",
    name: "The Oberoi",
    price: 15000,
    city: "delhi",
    commissionPct: 15,
  },
  {
    hotelId: "b6",
    name: "Hyatt Regency",
    price: 6900,
    city: "mumbai",
    commissionPct: 12,
  },
  {
    hotelId: "b7",
    name: "ITC Grand Central",
    price: 8100,
    city: "mumbai",
    commissionPct: 15,
  },
];

export const mockSuppliersRouter = Router();

// GET /supplierA/hotels?city=delhi
mockSuppliersRouter.get("/supplierA/hotels", (req: Request, res: Response) => {
  if (req.query.simulateDown === "true") {
    return res.status(503).json({ error: "Supplier A is temporarily unavailable" });
  }

  const city = (req.query.city as string | undefined)?.toLowerCase();
  if (!city) {
    return res.json(SUPPLIER_A_DATA);
  }

  const filtered = SUPPLIER_A_DATA.filter((h) => h.city.toLowerCase() === city);
  res.json(filtered);
});

// GET /supplierB/hotels?city=delhi
mockSuppliersRouter.get("/supplierB/hotels", (req: Request, res: Response) => {
  if (req.query.simulateDown === "true") {
    return res.status(503).json({ error: "Supplier B is temporarily unavailable" });
  }

  const city = (req.query.city as string | undefined)?.toLowerCase();
  if (!city) {
    return res.json(SUPPLIER_B_DATA);
  }

  const filtered = SUPPLIER_B_DATA.filter((h) => h.city.toLowerCase() === city);
  res.json(filtered);
});

export interface SupplierHotelRaw {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface BestOfferHotel {
  name: string;
  price: number;
  supplier: "Supplier A" | "Supplier B";
  commissionPct: number;
}

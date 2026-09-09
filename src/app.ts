import express, { type Request, type Response } from "express";
import { mockSuppliersRouter } from "./api/mock_api.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount mocked supplier routes
app.use("/api/suppliers", mockSuppliersRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Hotel Aggregator API is running",
    endpoints: {
      supplier1: "/api/suppliers/supplier-1/hotels",
      supplier2: "/api/suppliers/supplier-2/hotels",
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

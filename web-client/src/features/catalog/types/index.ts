export interface BranchStockItem {
  storeId: string;
  branchCode: string;
  name: string;
  city: 'HCM' | 'HN' | 'DN';
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
}

export interface LaptopProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  useCase: 'OFFICE' | 'CREATOR' | 'GAMING' | 'PREMIUM';
  priceVnd: string; // NUMERIC(18,0) string — never float
  originalPriceVnd?: string;
  formattedPrice: string;
  ramGb: number;
  ramType: string;
  storageGb: number;
  storageType: string;
  cpuModel: string;
  cpuScore: number; // Out of 100 for comparison matrix
  gpuModel: string;
  gpuScore: number;
  displaySpec: string;
  colorGamut: string;
  refreshRateHz: number;
  weightKg: string;
  batteryHours: number;
  warrantyMonths: number;
  returnDays: number;
  highlights: string[];
  inStock: boolean;
  totalAvailableStock: number;
  branches: BranchStockItem[];
}

export interface CatalogFilterParams {
  search?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  minRam?: number;
  useCase?: string;
  onlyInStock?: boolean;
}


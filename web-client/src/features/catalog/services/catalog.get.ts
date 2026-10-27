import { apiFetch } from '@/lib/api-client';
import { formatVND, parseVndBigInt } from '@/lib/utils';
import { LaptopProduct, CatalogFilterParams } from '../types';

/**
 * Deterministic Baseline Catalog (SSOT Seed Mirror)
 * Used when SSR/CSR hydrates or when graceful degradation tier activates.
 */
export const BASELINE_LAPTOP_CATALOG: LaptopProduct[] = [
  {
    id: 'var-asus-vivobook-15',
    sku: 'LT-ASUS-VIVO15-OLED',
    name: 'Laptop Asus Vivobook 15 OLED A1505VA',
    brand: 'ASUS',
    category: 'Laptop Học tập - Văn phòng',
    useCase: 'OFFICE',
    priceVnd: '17990000',
    originalPriceVnd: '19990000',
    formattedPrice: formatVND('17990000'),
    ramGb: 16,
    ramType: '16GB DDR4 3200MHz (Nâng cấp tối đa 24GB)',
    storageGb: 512,
    storageType: '512GB M.2 PCIe Gen 4 NVMe SSD',
    cpuModel: 'Intel Core i5-13500H (12 nhân, 16 luồng, 4.7GHz)',
    cpuScore: 86,
    gpuModel: 'Intel Iris Xe Graphics',
    gpuScore: 68,
    displaySpec: '15.6" 2.8K (2880x1620) OLED 120Hz, 600 nits HDR',
    colorGamut: '100% DCI-P3 Pantone Validated',
    refreshRateHz: 120,
    weightKg: '1.70 kg',
    batteryHours: 10,
    warrantyMonths: 24,
    returnDays: 30,
    highlights: [
      'Màn hình OLED 2.8K 120Hz chuẩn màu điện ảnh 100% DCI-P3',
      'Vi xử lý dòng H hiệu năng cao 12 nhân 16 luồng',
      'Đổi mới miễn phí 30 ngày nếu lỗi phần cứng nhà sản xuất',
      'Bảo hành chính hãng 24 tháng toàn quốc',
    ],
    inStock: true,
    totalAvailableStock: 25,
    branches: [
      {
        storeId: 'store-hcm-q1',
        branchCode: 'MWG_HCM_001',
        name: '136 Nguyễn Thái Học, Q.1, TP.HCM',
        city: 'HCM',
        physicalQty: 15,
        reservedQty: 3,
        availableQty: 12,
      },
      {
        storeId: 'store-hn-cg',
        branchCode: 'MWG_HN_002',
        name: '117 Thái Hà, Đống Đa, Hà Nội',
        city: 'HN',
        physicalQty: 10,
        reservedQty: 2,
        availableQty: 8,
      },
      {
        storeId: 'store-dn-hc',
        branchCode: 'MWG_DN_003',
        name: '320 đường 2/9, Hải Châu, Đà Nẵng',
        city: 'DN',
        physicalQty: 6,
        reservedQty: 1,
        availableQty: 5,
      },
    ],
  },
  {
    id: 'var-dell-inspiron-14',
    sku: 'LT-DELL-INSP14-5430',
    name: 'Laptop Dell Inspiron 14 5430',
    brand: 'DELL',
    category: 'Laptop Học tập - Văn phòng',
    useCase: 'OFFICE',
    priceVnd: '18490000',
    originalPriceVnd: '20490000',
    formattedPrice: formatVND('18490000'),
    ramGb: 16,
    ramType: '16GB LPDDR5 4800MHz Dual-Channel',
    storageGb: 512,
    storageType: '512GB M.2 PCIe NVMe SSD',
    cpuModel: 'Intel Core i5-1335U (10 nhân, 12 luồng, 4.6GHz)',
    cpuScore: 79,
    gpuModel: 'Intel Iris Xe Graphics',
    gpuScore: 65,
    displaySpec: '14.0" FHD+ (1920x1200) 16:10 WVA Anti-Glare',
    colorGamut: '100% sRGB ComfortView',
    refreshRateHz: 60,
    weightKg: '1.53 kg',
    batteryHours: 11,
    warrantyMonths: 24,
    returnDays: 30,
    highlights: [
      'Khung nhôm nguyên khối Platinum Silver bền bỉ',
      'RAM 16GB LPDDR5 tốc độ 4800MHz tiết kiệm điện',
      'Cảm biến vân tay 1 chạm + cổng Thunderbolt 4',
      'Bảo hành tận nơi ProSupport & Đổi mới 30 ngày',
    ],
    inStock: true,
    totalAvailableStock: 18,
    branches: [
      {
        storeId: 'store-hcm-q1',
        branchCode: 'MWG_HCM_001',
        name: '136 Nguyễn Thái Học, Q.1, TP.HCM',
        city: 'HCM',
        physicalQty: 10,
        reservedQty: 2,
        availableQty: 8,
      },
      {
        storeId: 'store-hn-cg',
        branchCode: 'MWG_HN_002',
        name: '117 Thái Hà, Đống Đa, Hà Nội',
        city: 'HN',
        physicalQty: 7,
        reservedQty: 1,
        availableQty: 6,
      },
      {
        storeId: 'store-dn-hc',
        branchCode: 'MWG_DN_003',
        name: '320 đường 2/9, Hải Châu, Đà Nẵng',
        city: 'DN',
        physicalQty: 5,
        reservedQty: 1,
        availableQty: 4,
      },
    ],
  },
  {
    id: 'var-lenovo-thinkbook-14',
    sku: 'LT-LENOVO-TB14-G6',
    name: 'Laptop Lenovo ThinkBook 14 G6+ (2024 AI PC)',
    brand: 'LENOVO',
    category: 'Laptop Đồ họa - Kỹ thuật',
    useCase: 'CREATOR',
    priceVnd: '19990000',
    originalPriceVnd: '22490000',
    formattedPrice: formatVND('19990000'),
    ramGb: 16,
    ramType: '16GB LPDDR5X 7467MHz Siêu tốc',
    storageGb: 512,
    storageType: '512GB PCIe 4.0x4 NVMe SSD (2 khe M.2)',
    cpuModel: 'Intel Core Ultra 5 125H (14 nhân, 18 luồng + AI NPU)',
    cpuScore: 93,
    gpuModel: 'Intel Arc Graphics (7-Cores Ray Tracing)',
    gpuScore: 84,
    displaySpec: '14.5" 2.5K (2560x1600) IPS 90Hz, 350 nits',
    colorGamut: '100% sRGB Hardware Low Blue Light',
    refreshRateHz: 90,
    weightKg: '1.50 kg',
    batteryHours: 14,
    warrantyMonths: 24,
    returnDays: 30,
    highlights: [
      'Chip Intel Core Ultra 5 125H tích hợp nhân AI NPU chuyên dụng',
      'Đồ họa Intel Arc mạnh gấp đôi thế hệ cũ, dựng video 4K mượt',
      'Đạt chuẩn độ bền quân đội Mỹ MIL-STD-810H',
      'Pin lớn 85Wh dùng thực tế lên đến 14 giờ',
    ],
    inStock: true,
    totalAvailableStock: 14,
    branches: [
      {
        storeId: 'store-hcm-q1',
        branchCode: 'MWG_HCM_001',
        name: '136 Nguyễn Thái Học, Q.1, TP.HCM',
        city: 'HCM',
        physicalQty: 9,
        reservedQty: 2,
        availableQty: 7,
      },
      {
        storeId: 'store-hn-cg',
        branchCode: 'MWG_HN_002',
        name: '117 Thái Hà, Đống Đa, Hà Nội',
        city: 'HN',
        physicalQty: 6,
        reservedQty: 1,
        availableQty: 5,
      },
      {
        storeId: 'store-dn-hc',
        branchCode: 'MWG_DN_003',
        name: '320 đường 2/9, Hải Châu, Đà Nẵng',
        city: 'DN',
        physicalQty: 3,
        reservedQty: 1,
        availableQty: 2,
      },
    ],
  },
  {
    id: 'var-acer-swift-go-14',
    sku: 'LT-ACER-SWIFT-GO14',
    name: 'Laptop Acer Swift Go 14 OLED SFG14',
    brand: 'ACER',
    category: 'Laptop Học tập - Văn phòng',
    useCase: 'OFFICE',
    priceVnd: '16990000',
    originalPriceVnd: '18990000',
    formattedPrice: formatVND('16990000'),
    ramGb: 16,
    ramType: '16GB LPDDR5 6400MHz',
    storageGb: 512,
    storageType: '512GB PCIe Gen 4 NVMe SSD',
    cpuModel: 'Intel Core i5-13500H (12 nhân, 16 luồng)',
    cpuScore: 85,
    gpuModel: 'Intel Iris Xe Graphics',
    gpuScore: 67,
    displaySpec: '14.0" 2.8K (2880x1800) OLED 90Hz, 1ms',
    colorGamut: '100% DCI-P3 TrueBlack 500',
    refreshRateHz: 90,
    weightKg: '1.25 kg',
    batteryHours: 11,
    warrantyMonths: 24,
    returnDays: 30,
    highlights: [
      'Trọng lượng siêu nhẹ chỉ 1.25 kg tiện di chuyển',
      'Màn hình OLED 2.8K 90Hz sắc nét tuyệt đối',
      'Webcam QHD 1440p khử nhiễu AI Acer PurifiedView',
      'Giá tốt nhất phân khúc Laptop OLED 16GB RAM',
    ],
    inStock: true,
    totalAvailableStock: 9,
    branches: [
      {
        storeId: 'store-hcm-q1',
        branchCode: 'MWG_HCM_001',
        name: '136 Nguyễn Thái Học, Q.1, TP.HCM',
        city: 'HCM',
        physicalQty: 5,
        reservedQty: 1,
        availableQty: 4,
      },
      {
        storeId: 'store-hn-cg',
        branchCode: 'MWG_HN_002',
        name: '117 Thái Hà, Đống Đa, Hà Nội',
        city: 'HN',
        physicalQty: 4,
        reservedQty: 1,
        availableQty: 3,
      },
      {
        storeId: 'store-dn-hc',
        branchCode: 'MWG_DN_003',
        name: '320 đường 2/9, Hải Châu, Đà Nẵng',
        city: 'DN',
        physicalQty: 3,
        reservedQty: 1,
        availableQty: 2,
      },
    ],
  },
  {
    id: 'var-macbook-air-m2',
    sku: 'LT-APPLE-MBA-M2-16GB',
    name: 'MacBook Air 13.6 inch M2 (Bản 16GB Unified Memory)',
    brand: 'APPLE',
    category: 'Laptop Mỏng nhẹ cao cấp',
    useCase: 'PREMIUM',
    priceVnd: '26990000',
    originalPriceVnd: '28990000',
    formattedPrice: formatVND('26990000'),
    ramGb: 16,
    ramType: '16GB Unified Memory băng thông 100GB/s',
    storageGb: 512,
    storageType: '512GB Apple SSD siêu tốc',
    cpuModel: 'Apple M2 (8-Core CPU, 16-Core Neural Engine)',
    cpuScore: 91,
    gpuModel: 'Apple M2 10-Core GPU',
    gpuScore: 86,
    displaySpec: '13.6" Liquid Retina (2560x1664) 500 nits True Tone',
    colorGamut: 'Wide Color P3',
    refreshRateHz: 60,
    weightKg: '1.24 kg',
    batteryHours: 18,
    warrantyMonths: 12,
    returnDays: 30,
    highlights: [
      'Pin lên tới 18 giờ làm việc liên tục không cần sạc',
      'RAM 16GB Unified Memory đa nhiệm mượt mà',
      'Thiết kế nhôm nguyên khối không quạt tản nhiệt êm tuyệt đối',
      'Bảo hành chính hãng Apple Việt Nam & Đổi mới 30 ngày MWG',
    ],
    inStock: true,
    totalAvailableStock: 11,
    branches: [
      {
        storeId: 'store-hcm-q1',
        branchCode: 'MWG_HCM_001',
        name: '136 Nguyễn Thái Học, Q.1, TP.HCM',
        city: 'HCM',
        physicalQty: 7,
        reservedQty: 1,
        availableQty: 6,
      },
      {
        storeId: 'store-hn-cg',
        branchCode: 'MWG_HN_002',
        name: '117 Thái Hà, Đống Đa, Hà Nội',
        city: 'HN',
        physicalQty: 4,
        reservedQty: 1,
        availableQty: 3,
      },
      {
        storeId: 'store-dn-hc',
        branchCode: 'MWG_DN_003',
        name: '320 đường 2/9, Hải Châu, Đà Nẵng',
        city: 'DN',
        physicalQty: 2,
        reservedQty: 0,
        availableQty: 2,
      },
    ],
  },
  {
    id: 'var-asus-rog-g16',
    sku: 'LT-ASUS-ROG-G16-RTX4060',
    name: 'Laptop Gaming Asus ROG Strix G16 G614JV',
    brand: 'ASUS',
    category: 'Laptop Gaming - Đồ họa nặng',
    useCase: 'GAMING',
    priceVnd: '34990000',
    originalPriceVnd: '37990000',
    formattedPrice: formatVND('34990000'),
    ramGb: 32,
    ramType: '32GB DDR5 4800MHz Dual-Channel',
    storageGb: 1024,
    storageType: '1TB PCIe 4.0 NVMe M.2 Performance SSD',
    cpuModel: 'Intel Core i7-13650HX (14 nhân, 20 luồng, 4.9GHz)',
    cpuScore: 97,
    gpuModel: 'NVIDIA GeForce RTX 4060 8GB GDDR6 (TGP 140W MUX Switch)',
    gpuScore: 96,
    displaySpec: '16.0" FHD+ (1920x1200) 165Hz ROG Nebula, G-Sync',
    colorGamut: '100% sRGB Dolby Vision',
    refreshRateHz: 165,
    weightKg: '2.50 kg',
    batteryHours: 8,
    warrantyMonths: 24,
    returnDays: 30,
    highlights: [
      'Card đồ họa rời RTX 4060 8GB TGP tối đa 140W kèm MUX Switch',
      'Hệ thống tản nhiệt 3 quạt keo kim loại lỏng Conductonaut Extreme',
      'RAM 32GB DDR5 + SSD 1TB xử lý mượt mô hình AI & 3D Rendering',
      'Bảo hành 24 tháng chính hãng Asus Việt Nam',
    ],
    inStock: true,
    totalAvailableStock: 7,
    branches: [
      {
        storeId: 'store-hcm-q1',
        branchCode: 'MWG_HCM_001',
        name: '136 Nguyễn Thái Học, Q.1, TP.HCM',
        city: 'HCM',
        physicalQty: 5,
        reservedQty: 1,
        availableQty: 4,
      },
      {
        storeId: 'store-hn-cg',
        branchCode: 'MWG_HN_002',
        name: '117 Thái Hà, Đống Đa, Hà Nội',
        city: 'HN',
        physicalQty: 3,
        reservedQty: 1,
        availableQty: 2,
      },
      {
        storeId: 'store-dn-hc',
        branchCode: 'MWG_DN_003',
        name: '320 đường 2/9, Hải Châu, Đà Nẵng',
        city: 'DN',
        physicalQty: 1,
        reservedQty: 0,
        availableQty: 1,
      },
    ],
  },
];

export function filterCatalogItems(
  items: LaptopProduct[],
  params: CatalogFilterParams = {}
): LaptopProduct[] {
  return items.filter((item) => {
    if (params.brand && params.brand !== 'ALL' && item.brand.toUpperCase() !== params.brand.toUpperCase()) {
      return false;
    }
    if (params.useCase && params.useCase !== 'ALL' && item.useCase !== params.useCase) {
      return false;
    }
    if (params.minRam && item.ramGb < params.minRam) {
      return false;
    }
    if (params.maxPrice) {
      const maxP = parseVndBigInt(params.maxPrice);
      if (maxP > BigInt(0) && parseVndBigInt(item.priceVnd) > maxP) return false;
    }
    if (params.minPrice) {
      const minP = parseVndBigInt(params.minPrice);
      if (minP > BigInt(0) && parseVndBigInt(item.priceVnd) < minP) return false;
    }
    if (params.onlyInStock && item.totalAvailableStock <= 0) {
      return false;
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      const hay = `${item.name} ${item.sku} ${item.brand} ${item.cpuModel} ${item.gpuModel} ${item.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Data Query (`catalog.get.ts` per 17-FRONTEND_DESIGN.md Section 5.1)
 */
export async function getLaptopCatalog(params: CatalogFilterParams = {}): Promise<LaptopProduct[]> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.brand && params.brand !== 'ALL') query.set('brand', params.brand);
  if (params.maxPrice) query.set('maxPrice', params.maxPrice);
  if (params.minRam) query.set('minRam', String(params.minRam));

  const res = await apiFetch<LaptopProduct[]>(`catalog/products?${query.toString()}`, {
    method: 'GET',
    retries: 1,
  });

  if (res.success && Array.isArray(res.data) && res.data.length > 0) {
    return res.data;
  }

  return filterCatalogItems(BASELINE_LAPTOP_CATALOG, params);
}

export async function getLaptopBySku(sku: string): Promise<LaptopProduct | null> {
  const normalized = decodeURIComponent(sku).toUpperCase().trim();
  const res = await apiFetch<LaptopProduct>(`catalog/products/${normalized}`, {
    method: 'GET',
    retries: 1,
  });

  if (res.success && res.data && res.data.sku) {
    return res.data;
  }

  return (
    BASELINE_LAPTOP_CATALOG.find((item) => item.sku.toUpperCase() === normalized) ||
    BASELINE_LAPTOP_CATALOG[0]
  );
}

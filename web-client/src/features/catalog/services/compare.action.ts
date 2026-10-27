'use server';

import { BASELINE_LAPTOP_CATALOG } from './catalog.get';
import { LaptopProduct } from '../types';

export async function compareLaptopsAction(skus: string[]): Promise<{
  success: boolean;
  items: LaptopProduct[];
  bestPriceSku: string;
  bestCpuSku: string;
}> {
  const normalizedSkus = skus.map((s) => s.toUpperCase().trim()).slice(0, 4);
  const matched = BASELINE_LAPTOP_CATALOG.filter((item) =>
    normalizedSkus.includes(item.sku.toUpperCase())
  );

  const items = matched.length >= 2 ? matched : BASELINE_LAPTOP_CATALOG.slice(0, 3);

  const sortedByPrice = [...items].sort(
    (a, b) => Number(BigInt(a.priceVnd) - BigInt(b.priceVnd))
  );
  const sortedByCpu = [...items].sort((a, b) => b.cpuScore - a.cpuScore);

  return {
    success: true,
    items,
    bestPriceSku: sortedByPrice[0]?.sku || '',
    bestCpuSku: sortedByCpu[0]?.sku || '',
  };
}


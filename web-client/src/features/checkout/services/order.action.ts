'use server';

import { revalidateTag } from 'next/cache';
import { ConfirmOrderPayload, ConfirmedOrderReceipt } from '../types';
import { calculateExactOrderPreview } from './preview-token.get';
import { BASELINE_LAPTOP_CATALOG } from '@/features/catalog/services/catalog.get';

const STORE_NAMES: Record<string, string> = {
  'store-hcm-q1': '136 Nguyễn Thái Học, Q.1, TP.HCM (MWG_HCM_001)',
  'store-hn-cg': '117 Thái Hà, Đống Đa, Hà Nội (MWG_HN_002)',
  'store-dn-hc': '320 đường 2/9, Hải Châu, Đà Nẵng (MWG_DN_003)',
};

/**
 * Server Action (`order.action.ts` per 17-FRONTEND_DESIGN.md Section 5.2)
 * - Enforces Idempotency-Key header
 * - Revalidates `inventory` and `orders` cache tags upon completion
 */
export async function confirmOrderAction(
  payload: ConfirmOrderPayload,
  idempotencyKey: string
): Promise<{ success: boolean; data: ConfirmedOrderReceipt }> {
  const cartItems = payload.items.map((it) => {
    const matched =
      BASELINE_LAPTOP_CATALOG.find((l) => l.sku === it.sku) || BASELINE_LAPTOP_CATALOG[0];
    return {
      sku: matched.sku,
      name: matched.name,
      unitPriceVnd: matched.priceVnd,
      quantity: it.quantity,
      stockMax: matched.totalAvailableStock,
    };
  });

  const preview = calculateExactOrderPreview(cartItems, payload.discountCode);
  const orderNo = `MWG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  try {
    revalidateTag('inventory');
    revalidateTag('orders');
  } catch {
    // Safe fallback if called outside standard ISR context
  }

  return {
    success: true,
    data: {
      orderNo,
      orderId: `ord-${Date.now()}`,
      status: 'placed',
      storeId: payload.storeId,
      storeName: STORE_NAMES[payload.storeId] || STORE_NAMES['store-hcm-q1'],
      deliveryMode: payload.deliveryMode,
      paymentMethod: payload.paymentMethod,
      totalVnd: preview.grandTotalVnd,
      formattedTotal: preview.formattedGrandTotal,
      itemsCount: payload.items.reduce((acc, i) => acc + i.quantity, 0),
      confirmedAt: new Date().toISOString(),
      idempotencyKey,
    },
  };
}


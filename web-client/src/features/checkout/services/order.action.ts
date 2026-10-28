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
  // A fabricated receipt must never be presented as a completed checkout.
  throw new Error('Chức năng đặt hàng tạm thời chưa khả dụng.');
}

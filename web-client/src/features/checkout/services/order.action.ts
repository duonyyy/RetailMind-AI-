'use server';

import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { ConfirmOrderPayload, ConfirmedOrderReceipt } from '../types';
import { apiFetch } from '@/lib/api-client';

const STORE_NAMES: Record<string, string> = {
  'store-hcm-q1': '136 Nguyễn Thái Học, Q.1, TP.HCM (MWG_HCM_001)',
  'store-hn-cg': '117 Thái Hà, Đống Đa, Hà Nội (MWG_HN_002)',
  'store-dn-hc': '320 đường 2/9, Hải Châu, Đà Nẵng (MWG_DN_003)',
};

/**
 * Server Action (`order.action.ts` per 17-FRONTEND_DESIGN.md Section 5.2)
 * - Enforces Idempotency-Key header
 * - Passes JWT Auth Token if present from HttpOnly cookies
 * - Calls core-api endpoint /orders/checkout
 * - Revalidates `inventory` and `orders` cache tags upon completion
 */
export async function confirmOrderAction(
  payload: ConfirmOrderPayload,
  idempotencyKey: string
): Promise<{ success: boolean; data: ConfirmedOrderReceipt }> {
  if (!idempotencyKey) {
    throw new Error('Thiếu Idempotency-Key chống trùng lặp giao dịch.');
  }

  const cookieStore = cookies();
  const token =
    cookieStore.get('retailmind_access_token')?.value ||
    cookieStore.get('access_token')?.value;

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await apiFetch<any>('orders/checkout', {
    method: 'POST',
    idempotencyKey,
    headers,
    body: JSON.stringify({
      storeId: payload.storeId,
      items: payload.items,
      discountCode: payload.discountCode,
      previewToken: payload.previewToken,
      paymentMethod: payload.paymentMethod,
    }),
  });

  if (!res.success || !res.data) {
    const errorMsg =
      res.error?.message ||
      'Không thể hoàn tất đặt hàng. Vui lòng đăng nhập tài khoản Khách hàng để tiến hành chốt đơn.';
    throw new Error(errorMsg);
  }

  const orderData = res.data?.data || res.data;

  const receipt: ConfirmedOrderReceipt = {
    orderNo: orderData.orderNo || `MWG-${Date.now()}`,
    orderId: orderData.orderId || `ord-${Date.now()}`,
    status: orderData.status === 'confirmed' ? 'confirmed' : 'placed',
    storeId: orderData.storeId || payload.storeId,
    storeName: STORE_NAMES[orderData.storeId || payload.storeId] || payload.storeId,
    deliveryMode: payload.deliveryMode,
    paymentMethod: payload.paymentMethod,
    totalVnd: orderData.totalVnd || '0',
    formattedTotal: orderData.formattedTotal || `${orderData.totalVnd} ₫`,
    itemsCount: orderData.itemsCount || payload.items.length,
    confirmedAt: orderData.confirmedAt || new Date().toISOString(),
    idempotencyKey,
  };

  try {
    revalidateTag('inventory');
    revalidateTag('orders');
  } catch {
    // revalidateTag is best effort
  }

  return {
    success: true,
    data: receipt,
  };
}

import { formatVND, parseVndBigInt } from '@/lib/utils';
import { CartItem, OrderPreviewResponse } from '../types';

const VOUCHER_RULES: Record<string, { discountVnd: bigint; minOrderVnd: bigint }> = {
  MWG_VIP500: { discountVnd: BigInt(500000), minOrderVnd: BigInt(15000000) },
  BACK2SCHOOL: { discountVnd: BigInt(300000), minOrderVnd: BigInt(12000000) },
};

/**
 * Exact BigInt Order Preview Calculator (`preview-token.get.ts` per 17-FRONTEND_DESIGN.md)
 * Eliminates all IEEE-754 floating point rounding issues per AGENTS.md Section 2.5.
 */
export function calculateExactOrderPreview(
  items: CartItem[],
  discountCode?: string
): OrderPreviewResponse {
  const zero = BigInt(0);
  const subtotalBig = items.reduce(
    (sum, item) => sum + parseVndBigInt(item.unitPriceVnd) * BigInt(item.quantity),
    zero
  );

  const normalizedCode = (discountCode || '').trim().toUpperCase();
  const rule = VOUCHER_RULES[normalizedCode];
  const discountBig =
    rule && subtotalBig >= rule.minOrderVnd ? rule.discountVnd : zero;

  const afterDiscount = subtotalBig > discountBig ? subtotalBig - discountBig : zero;
  // VAT 10% exact integer division: (afterDiscount * 10) / 100
  const vatBig = (afterDiscount * BigInt(10)) / BigInt(100);
  const grandTotalBig = afterDiscount + vatBig;

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  return {
    previewToken: `prv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    expiresAtIso: expiresAt,
    ttlSeconds: 600,
    items,
    subtotalVnd: subtotalBig.toString(),
    discountVnd: discountBig.toString(),
    vatVnd: vatBig.toString(),
    grandTotalVnd: grandTotalBig.toString(),
    formattedSubtotal: formatVND(subtotalBig),
    formattedDiscount: formatVND(discountBig),
    formattedVat: formatVND(vatBig),
    formattedGrandTotal: formatVND(grandTotalBig),
    discountCodeApplied: discountBig > zero ? normalizedCode : null,
  };
}

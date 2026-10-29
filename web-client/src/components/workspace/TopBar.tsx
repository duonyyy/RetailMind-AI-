'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, UserRound } from 'lucide-react';

export function TopBar() {
  const pathname = usePathname();
  return <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8"><div><p className="text-sm font-bold text-slate-900">{pathname.startsWith('/admin') ? 'Không gian quản trị' : 'Chào mừng đến với RetailMind'}</p><p className="hidden text-xs text-slate-500 sm:block">Khám phá và chọn thiết bị phù hợp với bạn</p></div><div className="flex items-center gap-2"><Link href="/cart" aria-label="Giỏ hàng" className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100"><ShoppingCart className="h-5 w-5" /></Link><Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><UserRound className="h-4 w-4" /><span>Đăng nhập</span></Link></div></header>;
}

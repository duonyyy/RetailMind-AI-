'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BookOpen, Boxes, ClipboardList, Headphones, Home, LayoutDashboard, Laptop, Menu, Package, Scale, Settings, Shield, ShoppingCart, Tags, User, Warehouse, X } from 'lucide-react';

const groups = [
  { title: 'Mua sắm', items: [
    { label: 'Trang chủ', href: '/', icon: Home }, { label: 'Danh mục laptop', href: '/catalog', icon: Laptop },
    { label: 'So sánh sản phẩm', href: '/compare', icon: Scale }, { label: 'Giỏ hàng', href: '/cart', icon: ShoppingCart },
    { label: 'Đơn hàng', href: '/orders', icon: Package }, { label: 'Bảo hành', href: '/warranty', icon: Shield },
    { label: 'Hỗ trợ', href: '/support', icon: Headphones }, { label: 'Hồ sơ', href: '/profile', icon: User },
  ] },
  { title: 'Quản trị', items: [
    { label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard }, { label: 'Sản phẩm', href: '/admin/products', icon: Boxes },
    { label: 'Tồn kho', href: '/admin/inventory', icon: Warehouse }, { label: 'Đơn hàng', href: '/admin/orders', icon: Package },
    { label: 'Phê duyệt', href: '/admin/hitl', icon: Shield }, { label: 'Tri thức', href: '/admin/knowledge', icon: BookOpen },
    { label: 'Khuyến mãi', href: '/admin/promotions', icon: Tags }, { label: 'Giám sát', href: '/admin/observability', icon: Activity },
    { label: 'Nhật ký', href: '/admin/audit-logs', icon: ClipboardList }, { label: 'Cửa hàng', href: '/admin/stores', icon: Warehouse },
    { label: 'Cài đặt', href: '/admin/settings', icon: Settings },
  ] },
];

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Mở menu" aria-expanded={open} className="fixed bottom-5 right-5 z-30 rounded-full bg-blue-600 p-4 text-white shadow-xl md:hidden"><Menu className="h-5 w-5" /></button>
    {open && <button type="button" aria-label="Đóng menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 shrink-0 items-center justify-between px-6"><Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">R</span><span><span className="block text-lg font-bold tracking-tight text-slate-900">RetailMind<span className="text-blue-600">.</span></span><span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">AI shopping assistant</span></span></Link><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 md:hidden" aria-label="Đóng menu"><X className="h-5 w-5" /></button></div>
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-4 pb-5">{groups.map(group => <div key={group.title} className="mt-5"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{group.title}</p><div className="space-y-1">{group.items.map(({ label, href, icon: Icon }) => { const active = href === '/' ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-[18px] w-[18px] shrink-0" />{label}</Link>; })}</div></div>)}</nav>
      <div className="border-t border-slate-100 px-6 py-4"><Link href="/status" className="text-xs font-medium text-slate-500 hover:text-blue-700">Trạng thái dịch vụ →</Link></div>
    </aside>
  </>;
}

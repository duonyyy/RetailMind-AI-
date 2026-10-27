'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  MessageSquareText,
  Laptop,
  Scale,
  ShoppingCart,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Headphones,
  UserCheck,
  LayoutDashboard,
  Boxes,
  Warehouse,
  ShoppingBag,
  ShieldAlert,
  BookOpenCheck,
  Activity,
  Tag,
  FileSpreadsheet,
  Building2,
  Settings,
  LogIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'rose';
  role: 'customer' | 'admin' | 'utility';
}

const NAV_ITEMS: NavItem[] = [
  // Customer & Guest Persona (Commerce Shell: SCR-01 -> SCR-13)
  {
    label: 'Trợ lý AI Tư vấn (SCR-02/06)',
    href: '/',
    icon: MessageSquareText,
    badge: 'SSE',
    badgeColor: 'blue',
    role: 'customer',
  },
  {
    label: 'Danh mục Laptop (SCR-03)',
    href: '/catalog',
    icon: Laptop,
    badge: 'SSOT',
    badgeColor: 'blue',
    role: 'customer',
  },
  {
    label: 'So sánh đối đầu 4 máy (SCR-05)',
    href: '/compare',
    icon: Scale,
    role: 'customer',
  },
  {
    label: 'Giỏ hàng BigInt (SCR-07)',
    href: '/cart',
    icon: ShoppingCart,
    role: 'customer',
  },
  {
    label: 'Đặt hàng Khóa tồn (SCR-08)',
    href: '/checkout',
    icon: CreditCard,
    badge: '10m Lock',
    badgeColor: 'emerald',
    role: 'customer',
  },
  {
    label: 'Đơn hàng 5 bước (SCR-10)',
    href: '/orders',
    icon: PackageCheck,
    role: 'customer',
  },
  {
    label: 'Cổng Bảo hành 30 ngày (SCR-11)',
    href: '/warranty',
    icon: ShieldCheck,
    role: 'customer',
  },
  {
    label: 'Hỗ trợ & Ticket (SCR-12)',
    href: '/support',
    icon: Headphones,
    role: 'customer',
  },
  {
    label: 'Hồ sơ & Quyền PII (SCR-13)',
    href: '/profile',
    icon: UserCheck,
    badge: 'NĐ 13',
    badgeColor: 'emerald',
    role: 'customer',
  },

  // Admin Persona (Admin Ops Shell: SCR-14 -> SCR-24)
  {
    label: 'Tổng quan & FinOps (SCR-14)',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: 'KPIs',
    badgeColor: 'blue',
    role: 'admin',
  },
  {
    label: 'Quản lý Sản phẩm PIM (SCR-15)',
    href: '/admin/products',
    icon: Boxes,
    role: 'admin',
  },
  {
    label: 'Tồn kho Đa Chi nhánh (SCR-16)',
    href: '/admin/inventory',
    icon: Warehouse,
    badge: 'ACID',
    badgeColor: 'emerald',
    role: 'admin',
  },
  {
    label: 'Quản lý Đơn hàng OMS (SCR-17)',
    href: '/admin/orders',
    icon: ShoppingBag,
    role: 'admin',
  },
  {
    label: 'Cổng Duyệt HITL Gate (SCR-18)',
    href: '/admin/hitl',
    icon: ShieldAlert,
    badge: 'HITL',
    badgeColor: 'amber',
    role: 'admin',
  },
  {
    label: 'Tri thức RAG & SHA-256 (SCR-19)',
    href: '/admin/knowledge',
    icon: BookOpenCheck,
    badge: 'Qdrant',
    badgeColor: 'blue',
    role: 'admin',
  },
  {
    label: 'Khuyến mãi & Giá (SCR-20)',
    href: '/admin/promotions',
    icon: Tag,
    role: 'admin',
  },
  {
    label: 'Giám sát Phoenix & OTel (SCR-21)',
    href: '/admin/observability',
    icon: Activity,
    badge: 'Arize',
    badgeColor: 'rose',
    role: 'admin',
  },
  {
    label: 'Sổ cái SHA-256 & RBAC (SCR-22)',
    href: '/admin/audit-logs',
    icon: FileSpreadsheet,
    role: 'admin',
  },
  {
    label: 'Siêu thị MWG Hubs (SCR-23)',
    href: '/admin/stores',
    icon: Building2,
    role: 'admin',
  },
  {
    label: 'Cấu hình Chống chịu (SCR-24)',
    href: '/admin/settings',
    icon: Settings,
    role: 'admin',
  },

  // Utility & Auth Shell (SCR-01, SCR-25..27)
  {
    label: 'Cổng Đăng nhập Auth (SCR-01)',
    href: '/login',
    icon: LogIn,
    role: 'utility',
  },
  {
    label: 'Sức khỏe Hạ tầng (SCR-27)',
    href: '/status',
    icon: Activity,
    badge: '100%',
    badgeColor: 'emerald',
    role: 'utility',
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const customerItems = NAV_ITEMS.filter((item) => item.role === 'customer');
  const adminItems = NAV_ITEMS.filter((item) => item.role === 'admin');
  const utilityItems = NAV_ITEMS.filter((item) => item.role === 'utility');

  const getBadgeClass = (color?: 'blue' | 'emerald' | 'amber' | 'rose') => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
  };

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-4">
      {!collapsed && (
        <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : getBadgeClass(item.badgeColor)
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-200 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden shadow-xs border border-blue-100 flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500">
              <Image
                src="/brand/logo-mark.png"
                alt="RetailMind AI Mark"
                width={36}
                height={36}
                className="object-contain p-1"
                priority
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col">
                <span className="font-extrabold text-slate-900 text-[15px] tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                  RetailMind<span className="text-blue-600">.AI</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase leading-none">
                  27 Screens • MWG
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-3 overflow-y-auto flex-1">
          {renderNavGroup('Commerce Shell (SCR-01..13)', customerItems)}
          {renderNavGroup('Admin Ops Shell (SCR-14..24)', adminItems)}
          {renderNavGroup('Auth & System (SCR-25..27)', utilityItems)}
        </div>
      </div>

      {/* Bottom Service Status */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 shrink-0">
        {!collapsed ? (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                NestJS Core API
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Port 4000</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                LangGraph Agent
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Port 8000</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="NestJS Core Connected" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" title="LangGraph Agent Connected" />
          </div>
        )}
      </div>
    </aside>
  );
}

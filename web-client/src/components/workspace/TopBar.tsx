'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getDictionary, SupportedLocale } from '@/i18n';
import {
  Bell,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  Globe,
} from 'lucide-react';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [locale, setLocale] = useState<SupportedLocale>('vi');
  const [quickQuery, setQuickQuery] = useState('');

  const dict = getDictionary(locale);
  const isAdmin = pathname.startsWith('/admin');

  const currentRole = isAdmin
    ? {
        role: locale === 'vi' ? 'Quản trị viên (Admin)' : 'Administrator (Admin)',
        name: 'Nguyễn Quản Trị',
        badge: 'ADMIN-01',
        color: 'text-blue-700 bg-blue-50 border border-blue-200/60',
      }
    : {
        role: locale === 'vi' ? 'Khách hàng (Customer)' : 'Customer Persona',
        name: 'Trần Khách Hàng',
        badge: 'CUST-883',
        color: 'text-cyan-700 bg-cyan-50 border border-cyan-200/60',
      };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    router.push(`/catalog?search=${encodeURIComponent(quickQuery.trim())}`);
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Left: Shell & Persona Info */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${currentRole.color}`}>
          {isAdmin ? <Shield className="w-4 h-4 text-blue-600" /> : <ShoppingBag className="w-4 h-4 text-cyan-600" />}
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium leading-none">
            Dual-Shell: <span className="font-semibold text-slate-700">{currentRole.role}</span>
          </div>
          <div className="text-sm font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <span>{dict.app.title.split('—')[0]}</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Sparkles className="w-2.5 h-2.5 text-blue-600" />
              MWG 2026 Edition
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Quick Search Input (Desktop) */}
      <form onSubmit={handleQuickSearch} className="hidden lg:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder={dict.app.searchPlaceholder}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs rounded-xl border border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </form>

      {/* Right: Bilingual Switcher (UC10), Persona Switcher, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Bilingual Toggle (UC10) */}
        <button
          type="button"
          onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition"
          title="Chuyển đổi ngôn ngữ Vi/En (UC10)"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="uppercase font-mono">{locale}</span>
        </button>

        {/* Quick Dual-Shell Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <Link
            href="/"
            className={`px-3 py-1 rounded-lg transition ${
              !isAdmin
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Commerce
          </Link>
          <Link
            href="/admin/dashboard"
            className={`px-3 py-1 rounded-lg transition ${
              isAdmin
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin Ops
          </Link>
        </div>

        {/* Notifications */}
        <Link
          href="/admin/hitl"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition relative"
          aria-label="Thông báo HITL"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition text-left"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
              {currentRole.name[0]}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-bold text-slate-900">{currentRole.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{currentRole.badge}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="font-bold text-slate-900">{currentRole.name}</div>
                <div className="text-[11px] text-slate-400">{currentRole.role}</div>
              </div>
              <div className="py-1 space-y-0.5">
                <Link
                  href="/profile"
                  className="block px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
                  onClick={() => setProfileOpen(false)}
                >
                  Hồ sơ &amp; Quyền riêng tư PII (SCR-13)
                </Link>
                <Link
                  href="/orders"
                  className="block px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
                  onClick={() => setProfileOpen(false)}
                >
                  Đơn hàng của tôi (SCR-10)
                </Link>
                <Link
                  href="/status"
                  className="block px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
                  onClick={() => setProfileOpen(false)}
                >
                  Báo cáo Sức khỏe Dịch vụ (SCR-27)
                </Link>
                <Link
                  href="/login"
                  className="block px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-bold"
                  onClick={() => setProfileOpen(false)}
                >
                  Chuyển đổi Tài khoản / Đăng nhập (SCR-01)
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

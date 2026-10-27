"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  User,
  Shield,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronDown,
} from "lucide-react";

export function TopBar() {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = pathname.startsWith("/admin");

  const currentRole = isAdmin
    ? {
        role: "Quản trị viên (Admin)",
        name: "Nguyễn Quản Trị",
        badge: "ADMIN-01",
        color: "text-blue-700 bg-blue-50 border border-blue-200/60",
      }
    : {
        role: "Khách hàng (Customer)",
        name: "Trần Khách Hàng",
        badge: "CUST-883",
        color: "text-cyan-700 bg-cyan-50 border border-cyan-200/60",
      };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Left: Phân hệ & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${currentRole.color}`}>
          {isAdmin ? <Shield className="w-4 h-4 text-blue-600" /> : <ShoppingBag className="w-4 h-4 text-cyan-600" />}
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium leading-none">
            Phân hệ: <span className="font-semibold text-slate-700">{currentRole.role}</span>
          </div>
          <div className="text-sm font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            RetailMind AI Platform
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Sparkles className="w-2.5 h-2.5 text-blue-600" />
              MWG 2026 Edition
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Quick Search Input (Desktop) */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm laptop, thông số, chính sách bảo hành..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm rounded-xl border border-transparent focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right: Switch Persona, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <Link
            href="/"
            className={`px-3 py-1 rounded-lg transition ${
              !isAdmin
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Khách hàng
          </Link>
          <Link
            href="/admin/inventory"
            className={`px-3 py-1 rounded-lg transition ${
              isAdmin
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Quản trị
          </Link>
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition relative"
          aria-label="Thông báo"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* Profile Card */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition text-left"
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentRole.name}</div>
                <div className="text-[11px] text-slate-400">{currentRole.role}</div>
              </div>
              <div className="py-1">
                <Link
                  href="/orders"
                  className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                  onClick={() => setProfileOpen(false)}
                >
                  Đơn hàng của tôi
                </Link>
                <Link
                  href="/admin/observability"
                  className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                  onClick={() => setProfileOpen(false)}
                >
                  Giám sát hệ thống Arize
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

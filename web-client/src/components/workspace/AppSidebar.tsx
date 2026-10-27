"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  MessageSquareText,
  Laptop,
  ShoppingCart,
  PackageCheck,
  Headphones,
  Warehouse,
  ShieldAlert,
  BookOpenCheck,
  Activity,
  Tag,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: "blue" | "emerald" | "amber" | "rose";
  role: "customer" | "admin";
}

const NAV_ITEMS: NavItem[] = [
  // Customer Persona
  {
    label: "Trợ lý AI Tư vấn Laptop",
    href: "/",
    icon: MessageSquareText,
    badge: "Agentic",
    badgeColor: "blue",
    role: "customer",
  },
  {
    label: "Danh mục Laptop MWG",
    href: "/catalog",
    icon: Laptop,
    badge: "SSOT",
    badgeColor: "blue",
    role: "customer",
  },
  {
    label: "Giỏ hàng & Chốt đơn",
    href: "/cart",
    icon: ShoppingCart,
    role: "customer",
  },
  {
    label: "Tra cứu Đơn & Bảo hành",
    href: "/orders",
    icon: PackageCheck,
    role: "customer",
  },
  {
    label: "Hỗ trợ & CSKH",
    href: "/support",
    icon: Headphones,
    role: "customer",
  },

  // Admin Persona
  {
    label: "Tồn kho Đa Chi nhánh",
    href: "/admin/inventory",
    icon: Warehouse,
    badge: "Real-time",
    badgeColor: "emerald",
    role: "admin",
  },
  {
    label: "Cổng Duyệt HITL Gate",
    href: "/admin/hitl",
    icon: ShieldAlert,
    badge: "Bồi hoàn",
    badgeColor: "amber",
    role: "admin",
  },
  {
    label: "Tài liệu Tri thức RAG",
    href: "/admin/knowledge",
    icon: BookOpenCheck,
    badge: "Qdrant",
    badgeColor: "blue",
    role: "admin",
  },
  {
    label: "Giám sát Phoenix & Traces",
    href: "/admin/observability",
    icon: Activity,
    badge: "Arize",
    badgeColor: "rose",
    role: "admin",
  },
  {
    label: "Khuyến mãi & Quy tắc Giá",
    href: "/admin/promotions",
    icon: Tag,
    role: "admin",
  },
  {
    label: "Audit Logs & RBAC",
    href: "/admin/audit-logs",
    icon: FileSpreadsheet,
    role: "admin",
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const customerItems = NAV_ITEMS.filter((item) => item.role === "customer");
  const adminItems = NAV_ITEMS.filter((item) => item.role === "admin");

  const getBadgeClass = (color?: "blue" | "emerald" | "amber" | "rose") => {
    switch (color) {
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "amber":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "rose":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "blue":
      default:
        return "bg-blue-50 text-blue-700 border-blue-200/80";
    }
  };

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-5">
      {!collapsed && (
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/90"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${
                        isActive
                          ? "bg-white/20 text-white border-white/30"
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
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80">
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
                  MWG Intelligence
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-3 overflow-y-auto max-h-[calc(100vh-160px)]">
          {renderNavGroup("Khách Hàng (Customer)", customerItems)}
          {renderNavGroup("Quản Trị Viên (Admin)", adminItems)}
        </div>
      </div>

      {/* Bottom Service Status */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
        {!collapsed ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                NestJS Core
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Port 3001</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                LangGraph Agent
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Port 8000</span>
            </div>
            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Nguồn: PostgreSQL SSOT</span>
              <span className="font-mono">v1.0-2026</span>
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

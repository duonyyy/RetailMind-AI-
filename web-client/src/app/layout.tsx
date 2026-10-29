import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar, TopBar } from "@/components/workspace";

export const metadata: Metadata = {
  title: "RetailMind AI — MWG Retail Intelligence Platform",
  description: "Khám phá laptop và nhận tư vấn cùng RetailMind AI.",
  icons: {
    icon: "/brand/favicon.ico",
    apple: "/brand/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 antialiased font-sans flex">
        {/* Collapsible Enterprise Navigation Sidebar */}
        <AppSidebar />

        {/* Main Workspace Frame */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Top Bar with Role Switcher & Search */}
          <TopBar />

          {/* Dynamic Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

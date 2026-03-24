"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, ListPlus, Globe, BarChart3, Settings } from "lucide-react";

const navItems = [
  { href: "/track", icon: Crosshair, label: "Track" },
  { href: "/manage", icon: ListPlus, label: "Events" },
  { href: "/apps", icon: Globe, label: "Apps" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-border pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-teal"
                  : "text-muted hover:text-teal"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

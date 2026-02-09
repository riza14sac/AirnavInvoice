"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FileText,
    PlusCircle,
    Upload,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
    userRole?: string;
}

const navigation = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "OPERATOR", "VIEWER"],
    },
    {
        name: "Services",
        href: "/services",
        icon: FileText,
        roles: ["ADMIN", "OPERATOR", "VIEWER"],
    },
    {
        name: "New Service",
        href: "/services/new",
        icon: PlusCircle,
        roles: ["ADMIN", "OPERATOR"],
    },
    {
        name: "Import CSV",
        href: "/services/import",
        icon: Upload,
        roles: ["ADMIN", "OPERATOR"],
    },
    {
        name: "Users",
        href: "/users",
        icon: Users,
        roles: ["ADMIN"],
    },
    {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["ADMIN"],
    },
];

export function Sidebar({ userRole = "VIEWER" }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    const filteredNav = navigation.filter((item) =>
        item.roles.includes(userRole)
    );

    return (
        <aside
            className={cn(
                "flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <Plane className="h-8 w-8 text-blue-400" />
                        <div>
                            <h1 className="text-lg font-bold text-white">AirNav</h1>
                            <p className="text-xs text-slate-400">WITT Invoice</p>
                        </div>
                    </div>
                )}
                {collapsed && <Plane className="h-8 w-8 text-blue-400 mx-auto" />}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1">
                {filteredNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                                isActive
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", collapsed && "mx-auto")} />
                            {!collapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 text-center">
                        Sultan Iskandar Muda Airport
                    </p>
                    <p className="text-xs text-slate-600 text-center">ICAO: WITT</p>
                </div>
            )}
        </aside>
    );
}

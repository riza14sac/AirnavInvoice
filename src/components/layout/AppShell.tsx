"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "@/components/ui/sonner";

function AppShellContent({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar userRole={session?.user?.role} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AppShellContent>{children}</AppShellContent>
        </SessionProvider>
    );
}

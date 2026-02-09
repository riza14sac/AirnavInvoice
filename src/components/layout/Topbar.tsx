"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";

export function Topbar() {
    const { data: session } = useSession();
    const [time, setTime] = useState<{ wib: string; utc: string }>({
        wib: "",
        utc: "",
    });

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime({
                wib: formatInTimeZone(now, "Asia/Jakarta", "dd MMM yyyy HH:mm:ss"),
                utc: formatInTimeZone(now, "UTC", "HH:mm:ss"),
            });
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const userInitials = session?.user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    const roleColor = {
        ADMIN: "bg-red-500",
        OPERATOR: "bg-blue-500",
        VIEWER: "bg-gray-500",
    }[session?.user?.role || "VIEWER"];

    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 shadow-sm">
            {/* Time Display */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <div className="flex gap-4">
                        <div>
                            <span className="text-slate-500">WIB:</span>{" "}
                            <span className="font-mono font-medium">{time.wib}</span>
                        </div>
                        <div className="border-l pl-4">
                            <span className="text-slate-500">UTC:</span>{" "}
                            <span className="font-mono font-medium">{time.utc}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
                <Badge variant="outline" className={`${roleColor} text-white border-none`}>
                    {session?.user?.role}
                </Badge>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-600 text-white">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {session?.user?.name}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-red-600"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

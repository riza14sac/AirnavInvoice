import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/register", "/forgot-password"];

// Routes that require specific roles
const adminRoutes = ["/users"];
const operatorRoutes = ["/services/new", "/services/import"];

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role;

    const isPublicRoute = publicRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
    );

    // Allow public routes
    if (isPublicRoute) {
        // Redirect to dashboard if already logged in
        if (isLoggedIn && nextUrl.pathname === "/login") {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return NextResponse.next();
    }

    // Require authentication for all other routes
    if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check admin routes
    if (adminRoutes.some((route) => nextUrl.pathname.startsWith(route))) {
        if (userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
    }

    // Check operator routes (OPERATOR and ADMIN can access)
    if (operatorRoutes.some((route) => nextUrl.pathname.startsWith(route))) {
        if (userRole === "VIEWER") {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files
         */
        "/((?!api|_next/static|_next/image|favicon.ico|logos|templates).*)",
    ],
};

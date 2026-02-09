import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canRead } from "@/lib/auth/rbac";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canRead(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        // Current month statistics
        const thisMonthStats = await prisma.flightService.aggregate({
            where: {
                arrivalDate: {
                    gte: thisMonthStart,
                    lte: thisMonthEnd,
                },
            },
            _sum: {
                grossTotal: true,
                netTotal: true,
            },
            _count: true,
        });

        // Last month statistics
        const lastMonthServices = await prisma.flightService.aggregate({
            where: {
                arrivalDate: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd,
                },
            },
            _sum: {
                grossTotal: true,
                netTotal: true,
            },
            _count: true,
        });

        // Paid vs Unpaid this month
        const [paidThisMonth, unpaidThisMonth] = await Promise.all([
            prisma.flightService.aggregate({
                where: {
                    arrivalDate: { gte: thisMonthStart, lte: thisMonthEnd },
                    status: "PAID",
                },
                _sum: { netTotal: true },
                _count: true,
            }),
            prisma.flightService.aggregate({
                where: {
                    arrivalDate: { gte: thisMonthStart, lte: thisMonthEnd },
                    status: "UNPAID",
                },
                _sum: { netTotal: true },
                _count: true,
            }),
        ]);

        // Total unpaid (all time)
        const totalUnpaid = await prisma.flightService.aggregate({
            where: { status: "UNPAID" },
            _sum: { netTotal: true },
            _count: true,
        });

        // Monthly trend (last 6 months)
        const monthlyTrend: Array<{
            month: string;
            gross: string;
            net: string;
            count: number;
        }> = [];

        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);

            const stats = await prisma.flightService.aggregate({
                where: {
                    arrivalDate: { gte: monthStart, lte: monthEnd },
                },
                _sum: { grossTotal: true, netTotal: true },
                _count: true,
            });

            monthlyTrend.push({
                month: monthDate.toISOString().slice(0, 7), // YYYY-MM
                gross: (stats._sum.grossTotal || BigInt(0)).toString(),
                net: (stats._sum.netTotal || BigInt(0)).toString(),
                count: stats._count,
            });
        }

        // Top airlines (by net total, this month) - with currency support
        // Fetch all services for this month to properly aggregate with currency conversion
        const thisMonthServices = await prisma.flightService.findMany({
            where: {
                arrivalDate: { gte: thisMonthStart, lte: thisMonthEnd },
            },
            select: {
                airline: true,
                netTotal: true,
                currency: true,
                exchangeRate: true,
            },
        });

        // Group by airline and compute aggregates with currency info
        const airlineMap = new Map<string, {
            netTotalIDR: bigint;  // Total in Rupiah (for sorting)
            netDisplay: number;   // Total in display currency (after conversion)
            count: number;
            currency: "IDR" | "USD";  // Dominant currency
            exchangeRate: number | null;
        }>();

        for (const service of thisMonthServices) {
            const existing = airlineMap.get(service.airline);
            const netIDR = service.netTotal;

            // Convert to display value
            let netDisplay = Number(netIDR);
            if (service.currency === "USD" && service.exchangeRate && service.exchangeRate > 0) {
                netDisplay = Number(netIDR) / service.exchangeRate;
            }

            if (existing) {
                existing.netTotalIDR += netIDR;
                existing.netDisplay += netDisplay;
                existing.count += 1;
                // Keep the most recent currency/exchangeRate (or USD if any)
                if (service.currency === "USD") {
                    existing.currency = "USD";
                    existing.exchangeRate = service.exchangeRate;
                }
            } else {
                airlineMap.set(service.airline, {
                    netTotalIDR: netIDR,
                    netDisplay: netDisplay,
                    count: 1,
                    currency: service.currency as "IDR" | "USD",
                    exchangeRate: service.exchangeRate,
                });
            }
        }

        // Convert to array and sort by netTotalIDR (descending)
        const topAirlines = Array.from(airlineMap.entries())
            .map(([airline, data]) => ({
                airline,
                netIDR: data.netTotalIDR.toString(),
                net: data.netDisplay.toString(),
                count: data.count,
                currency: data.currency,
                exchangeRate: data.exchangeRate,
            }))
            .sort((a, b) => BigInt(b.netIDR) > BigInt(a.netIDR) ? 1 : -1)
            .slice(0, 5);

        // Overdue list (unpaid, oldest first)
        const overdueList = await prisma.flightService.findMany({
            where: { status: "UNPAID" },
            orderBy: { arrivalDate: "asc" },
            take: 10,
            select: {
                id: true,
                seqNo: true,
                airline: true,
                flightNumber: true,
                receiptNo: true,
                arrivalDate: true,
                netTotal: true,
                currency: true,
                exchangeRate: true,
            },
        });

        // DOM vs INT breakdown this month
        const [domCount, intCount] = await Promise.all([
            prisma.flightService.count({
                where: {
                    arrivalDate: { gte: thisMonthStart, lte: thisMonthEnd },
                    flightType: "DOM",
                },
            }),
            prisma.flightService.count({
                where: {
                    arrivalDate: { gte: thisMonthStart, lte: thisMonthEnd },
                    flightType: "INT",
                },
            }),
        ]);

        return NextResponse.json({
            thisMonth: {
                gross: (thisMonthStats._sum.grossTotal || BigInt(0)).toString(),
                net: (thisMonthStats._sum.netTotal || BigInt(0)).toString(),
                count: thisMonthStats._count,
            },
            lastMonth: {
                gross: (lastMonthServices._sum.grossTotal || BigInt(0)).toString(),
                net: (lastMonthServices._sum.netTotal || BigInt(0)).toString(),
                count: lastMonthServices._count,
            },
            paidThisMonth: {
                net: (paidThisMonth._sum.netTotal || BigInt(0)).toString(),
                count: paidThisMonth._count,
            },
            unpaidThisMonth: {
                net: (unpaidThisMonth._sum.netTotal || BigInt(0)).toString(),
                count: unpaidThisMonth._count,
            },
            totalUnpaid: {
                net: (totalUnpaid._sum.netTotal || BigInt(0)).toString(),
                count: totalUnpaid._count,
            },
            monthlyTrend,
            topAirlines: topAirlines.map((a) => ({
                airline: a.airline,
                net: a.net,
                count: a.count,
                currency: a.currency,
                exchangeRate: a.exchangeRate,
            })),
            overdueList: overdueList.map((o) => ({
                ...o,
                netTotal: o.netTotal.toString(),
            })),
            flightTypeBreakdown: {
                dom: domCount,
                int: intCount,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard:", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard" },
            { status: 500 }
        );
    }
}

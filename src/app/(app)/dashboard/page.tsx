"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileText,
    CheckCircle,
    Clock,
    Plane,
    AlertTriangle,
} from "lucide-react";
import { formatRupiah, formatNumber, formatMoney, type Currency } from "@/lib/time/format";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

interface DashboardData {
    thisMonth: { gross: string; net: string; count: number };
    lastMonth: { gross: string; net: string; count: number };
    paidThisMonth: { net: string; count: number };
    unpaidThisMonth: { net: string; count: number };
    totalUnpaid: { net: string; count: number };
    monthlyTrend: Array<{ month: string; gross: string; net: string; count: number }>;
    topAirlines: Array<{ airline: string; net: string; count: number; currency: Currency; exchangeRate?: number | null }>;
    overdueList: Array<{
        id: string;
        seqNo: number;
        airline: string;
        flightNumber: string;
        receiptNo: string;
        arrivalDate: string;
        netTotal: string;
        currency: Currency;
        exchangeRate?: number | null;
    }>;
    flightTypeBreakdown: { dom: number; int: number };
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard")
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </AppShell>
        );
    }

    if (!data) {
        return (
            <AppShell>
                <div className="text-center text-slate-500">Failed to load dashboard</div>
            </AppShell>
        );
    }

    // Check if data has correct structure
    if (!data.thisMonth || !data.lastMonth) {
        return (
            <AppShell>
                <div className="text-center text-red-500">
                    <p>Error loading dashboard data.</p>
                    <p className="text-sm mt-2">Please check database connection.</p>
                </div>
            </AppShell>
        );
    }

    const thisMonthNet = BigInt(data.thisMonth.net || "0");
    const lastMonthNet = BigInt(data.lastMonth.net || "0");
    const percentChange = lastMonthNet > 0
        ? ((Number(thisMonthNet - lastMonthNet) / Number(lastMonthNet)) * 100).toFixed(1)
        : "0";
    const isPositiveChange = thisMonthNet >= lastMonthNet;

    // Helper to convert IDR amount to display currency (USD if international)
    const convertToDisplayCurrency = (
        amountIDR: number | bigint,
        currency: Currency,
        exchangeRate?: number | null
    ): number => {
        const amount = typeof amountIDR === "bigint" ? Number(amountIDR) : amountIDR;
        if (currency === "USD" && exchangeRate && exchangeRate > 0) {
            return amount / exchangeRate;
        }
        return amount;
    };

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500">Overview of AirNav billing operations</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* This Month Revenue */}
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">
                                This Month Revenue
                            </CardTitle>
                            <DollarSign className="h-5 w-5 opacity-80" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatRupiah(BigInt(data.thisMonth.net))}
                            </div>
                            <div className="flex items-center mt-2 text-sm opacity-90">
                                {isPositiveChange ? (
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                <span>{percentChange}% from last month</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Services */}
                    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">
                                Total Services This Month
                            </CardTitle>
                            <FileText className="h-5 w-5 opacity-80" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.thisMonth.count}</div>
                            <div className="flex items-center mt-2 text-sm opacity-90">
                                <span>DOM: {data.flightTypeBreakdown.dom} | INT: {data.flightTypeBreakdown.int}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Paid This Month */}
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">
                                Paid This Month
                            </CardTitle>
                            <CheckCircle className="h-5 w-5 opacity-80" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatRupiah(BigInt(data.paidThisMonth.net))}
                            </div>
                            <div className="flex items-center mt-2 text-sm opacity-90">
                                <span>{data.paidThisMonth.count} invoices paid</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Unpaid */}
                    <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">
                                Total Unpaid
                            </CardTitle>
                            <Clock className="h-5 w-5 opacity-80" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatRupiah(BigInt(data.totalUnpaid.net))}
                            </div>
                            <div className="flex items-center mt-2 text-sm opacity-90">
                                <span>{data.totalUnpaid.count} invoices pending</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts and Tables Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Trend */}
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Monthly Trend (Last 6 Months)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.monthlyTrend.map((item) => {
                                    const net = Number(item.net);
                                    const maxNet = Math.max(...data.monthlyTrend.map((t) => Number(t.net)));
                                    const percentage = maxNet > 0 ? (net / maxNet) * 100 : 0;

                                    return (
                                        <div key={item.month} className="flex items-center gap-4">
                                            <span className="w-20 text-sm text-slate-600 font-mono">
                                                {item.month}
                                            </span>
                                            <div className="flex-1">
                                                <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <span className="w-32 text-sm text-slate-700 text-right">
                                                {formatRupiah(BigInt(item.net))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Airlines */}
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Top Airlines This Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.topAirlines.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No data available</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.topAirlines.map((airline, index) => (
                                        <div
                                            key={airline.airline}
                                            className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Plane className="h-4 w-4 text-slate-400" />
                                                    <span className="font-medium text-slate-700">
                                                        {airline.airline}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {airline.count} services
                                                </span>
                                            </div>
                                            <span className="font-semibold text-slate-700">
                                                {formatMoney(Number(airline.net), airline.currency)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Overdue List */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Overdue Invoices
                            </CardTitle>
                            <Link href="/services?status=UNPAID">
                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                                    View All
                                </Badge>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {data.overdueList.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">
                                No overdue invoices 🎉
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 font-medium text-slate-600">No.</th>
                                            <th className="text-left py-2 font-medium text-slate-600">Receipt No</th>
                                            <th className="text-left py-2 font-medium text-slate-600">Airline</th>
                                            <th className="text-left py-2 font-medium text-slate-600">Flight</th>
                                            <th className="text-left py-2 font-medium text-slate-600">Date</th>
                                            <th className="text-right py-2 font-medium text-slate-600">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.overdueList.map((item) => (
                                            <tr key={item.id} className="border-b hover:bg-slate-50">
                                                <td className="py-2">{item.seqNo}</td>
                                                <td className="py-2 font-mono text-xs">{item.receiptNo}</td>
                                                <td className="py-2">{item.airline}</td>
                                                <td className="py-2">{item.flightNumber}</td>
                                                <td className="py-2">
                                                    {new Date(item.arrivalDate).toLocaleDateString("id-ID")}
                                                </td>
                                                <td className="py-2 text-right font-medium">
                                                    {formatMoney(convertToDisplayCurrency(BigInt(item.netTotal), item.currency, item.exchangeRate), item.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}

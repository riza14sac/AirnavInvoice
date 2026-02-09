"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    Search,
    Download,
    FileText,
    Eye,
    MoreHorizontal,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { formatMoney, type Currency } from "@/lib/time/format";
import { formatAsWib } from "@/lib/time/tz";
import { toast } from "sonner";

interface Service {
    id: string;
    seqNo: number;
    airline: string;
    flightType: string;
    flightNumber: string;
    registration: string;
    arrivalDate: string;
    ataUtc?: string;
    atdUtc?: string;
    advanceExtend: string;
    durationMinutes: number;
    billableHours: number;
    netTotal: string;
    receiptNo: string;
    status: string;
    createdAt: string;
    currency: Currency;
    exchangeRate?: number;
}

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

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export default function ServicesPage() {
    const router = useRouter();

    const [services, setServices] = useState<Service[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);

    // Filters - no longer using searchParams
    const [search, setSearch] = useState("");
    const [flightType, setFlightType] = useState("");
    const [status, setStatus] = useState("");
    const [sortField, setSortField] = useState("createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const fetchServices = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: "20",
                sortField,
                sortDir,
            });

            if (search) params.set("search", search);
            if (flightType) params.set("flightType", flightType);
            if (status) params.set("status", status);

            const res = await fetch(`/api/services?${params}`);
            const data = await res.json();

            setServices(data.data || []);
            setPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
        } catch (error) {
            console.error("Error fetching services:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices(1);
    }, [flightType, status, sortField, sortDir]);

    const handleSearch = () => {
        fetchServices(1);
    };

    const handleMarkPaid = async (id: string) => {
        try {
            const res = await fetch(`/api/services/${id}/mark-paid`, { method: "POST" });
            if (res.ok) {
                toast.success("Invoice marked as paid");
                fetchServices(pagination.page);
            } else {
                toast.error("Failed to update status");
            }
        } catch {
            toast.error("Error updating status");
        }
    };

    const handleExport = async (format: "input" | "output") => {
        const params = new URLSearchParams({ format });
        if (flightType) params.set("flightType", flightType);
        if (status) params.set("status", status);

        window.open(`/api/services/export?${params}`, "_blank");
        toast.success(`Exporting ${format} CSV...`);
    };

    const statusBadge = (status: string) => {
        if (status === "PAID") {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
        }
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Unpaid</Badge>;
    };

    const flightTypeBadge = (type: string) => {
        if (type === "DOM") {
            return <Badge variant="outline" className="border-blue-300 text-blue-600">DOM</Badge>;
        }
        return <Badge variant="outline" className="border-purple-300 text-purple-600">INT</Badge>;
    };

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Services</h1>
                        <p className="text-slate-500">Manage flight service billing records</p>
                    </div>
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExport("input")}>
                                    Export Input CSV (Re-importable)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport("output")}>
                                    Export Output CSV (Calculations)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Link href="/services/new">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4 mr-2" />
                                New Service
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search airline, flight, receipt..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={flightType} onValueChange={setFlightType}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Flight Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="DOM">Domestic</SelectItem>
                                    <SelectItem value="INT">International</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={`${sortField}-${sortDir}`} onValueChange={(v) => {
                                const [field, dir] = v.split("-");
                                setSortField(field);
                                setSortDir(dir as "asc" | "desc");
                            }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                                    <SelectItem value="netTotal-desc">Highest Amount</SelectItem>
                                    <SelectItem value="netTotal-asc">Lowest Amount</SelectItem>
                                    <SelectItem value="durationMinutes-desc">Longest Duration</SelectItem>
                                    <SelectItem value="durationMinutes-asc">Shortest Duration</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSearch} variant="secondary">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">No</TableHead>
                                    <TableHead>Receipt No</TableHead>
                                    <TableHead>Airline</TableHead>
                                    <TableHead>Flight</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>ATA/ATD (WIB)</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-16"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : services.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                                            No services found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    services.map((service) => (
                                        <TableRow key={service.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-sm">{service.seqNo}</TableCell>
                                            <TableCell className="font-mono text-xs">{service.receiptNo}</TableCell>
                                            <TableCell className="font-medium">{service.airline}</TableCell>
                                            <TableCell>{service.flightNumber}</TableCell>
                                            <TableCell>{flightTypeBadge(service.flightType)}</TableCell>
                                            <TableCell className="text-sm">
                                                {service.ataUtc
                                                    ? formatAsWib(service.ataUtc, "dd MMM yyyy HH:mm")
                                                    : service.atdUtc
                                                        ? formatAsWib(service.atdUtc, "dd MMM yyyy HH:mm")
                                                        : "-"
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {Math.floor(service.durationMinutes / 60)}h {service.durationMinutes % 60}m
                                                <span className="text-slate-400 text-xs ml-1">
                                                    ({service.billableHours} jam)
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatMoney(convertToDisplayCurrency(BigInt(service.netTotal), service.currency, service.exchangeRate), service.currency)}
                                            </TableCell>
                                            <TableCell>{statusBadge(service.status)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/services/${service.id}`}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(`/api/services/${service.id}/pdf/breakdown`, "_blank")}
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            View Breakdown PDF
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(`/api/services/${service.id}/pdf/receipt`, "_blank")}
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            View Receipt PDF
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(`/api/services/${service.id}/pdf/combined`, "_blank")}
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            View Combined PDF
                                                        </DropdownMenuItem>
                                                        {service.status === "UNPAID" && (
                                                            <DropdownMenuItem onClick={() => handleMarkPaid(service.id)}>
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Mark as Paid
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                            {pagination.total} results
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchServices(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="flex items-center px-3 text-sm">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchServices(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

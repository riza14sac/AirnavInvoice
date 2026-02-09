"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    FileText,
    Download,
    CheckCircle,
    Edit,
    Printer,
    Plane,
    Clock,
    X,
    Eye,
} from "lucide-react";
import { formatMoney, numberToWords, type Currency } from "@/lib/time/format";
import { formatAsWib, formatAsUtc } from "@/lib/time/tz";
import { UNIT_RATES, BANK_DETAILS } from "@/lib/config/rates";
import { toast } from "sonner";

// Helper to safely convert to BigInt
const safeBigInt = (value: string | number | null | undefined): bigint => {
    if (value === null || value === undefined || value === "") return BigInt(0);
    try {
        return BigInt(value);
    } catch {
        return BigInt(0);
    }
};

// Helper to convert IDR amount to display currency (USD if international)
const convertToDisplayCurrency = (
    amountIDR: number | bigint,
    currency: Currency,
    exchangeRate?: number
): number => {
    const amount = typeof amountIDR === "bigint" ? Number(amountIDR) : amountIDR;
    if (currency === "USD" && exchangeRate && exchangeRate > 0) {
        return amount / exchangeRate;
    }
    return amount;
};

interface ServiceDetail {
    id: string;
    seqNo: number;
    airline: string;
    flightType: string;
    flightNumber: string;
    flightNumber2?: string;
    registration: string;
    aircraftType: string;
    depStation: string;
    arrStation: string;
    arrivalDate: string;
    ataUtc?: string;
    atdUtc?: string;
    advanceExtend: string;
    serviceStartUtc: string;
    serviceEndUtc: string;
    useApp: boolean;
    useTwr: boolean;
    useAfis: boolean;
    picDinas?: string;
    durationMinutes: number;
    billableHours: number;
    grossApp: string;
    grossTwr: string;
    grossAfis: string;
    grossTotal: string;
    ppn: string;
    netTotal: string;
    receiptNo: string;
    receiptDate: string;
    status: "UNPAID" | "PAID" | "UNDERPAID" | "OVERPAID";
    paidAt?: string;
    createdAt: string;
    // Enhanced Payment Tracking
    amountPaid?: string;
    paymentDifference?: string;
    paymentDays?: number;
    // Monitoring
    monitoringStatus: "PENDING" | "BILLED" | "DEPOSIT" | "COMPLETED";
    // PPH 23
    pph23Withheld: boolean;
    // Faktur Pajak
    fakturPajakNo?: string;
    fakturPajakDate?: string;
    currency: Currency;
    exchangeRate?: number;
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [service, setService] = useState<ServiceDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewType, setPreviewType] = useState<"breakdown" | "receipt" | "combined">("combined");
    const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
    const [pdfLoading, setPdfLoading] = useState(false);

    // Payment modal state
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");

    useEffect(() => {
        fetch(`/api/services/${resolvedParams.id}`)
            .then((res) => res.json())
            .then((data) => {
                setService(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [resolvedParams.id]);

    const openPaymentModal = () => {
        if (service) {
            setPaymentAmount(service.netTotal);
            setPaymentModalOpen(true);
        }
    };

    const handleMarkPaid = async () => {
        if (!service) return;

        try {
            const res = await fetch(`/api/services/${service.id}/mark-paid`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amountPaid: paymentAmount }),
            });
            if (res.ok) {
                toast.success("Pembayaran berhasil dicatat!");
                const updated = await fetch(`/api/services/${service.id}`).then(r => r.json());
                setService(updated);
                setPaymentModalOpen(false);
            } else {
                toast.error("Gagal update status");
            }
        } catch {
            toast.error("Error updating status");
        }
    };

    const handleGeneratePdf = async () => {
        if (!service) return;

        try {
            toast.info("Generating PDFs...");
            const res = await fetch(`/api/services/${service.id}/generate-pdf`, { method: "POST" });
            if (res.ok) {
                toast.success("PDFs generated successfully");
            } else {
                toast.error("Failed to generate PDFs");
            }
        } catch {
            toast.error("Error generating PDFs");
        }
    };

    const handlePreview = async (type: "breakdown" | "receipt" | "combined") => {
        if (!service) return;

        setPreviewType(type);
        setPdfLoading(true);
        setPreviewOpen(true);
        setPdfDataUrl("");

        try {
            const res = await fetch(`/api/services/${service.id}/pdf/${type}`);
            if (!res.ok) throw new Error("Failed to load PDF");

            const arrayBuffer = await res.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ""
                )
            );
            setPdfDataUrl(`data:application/pdf;base64,${base64}`);
        } catch (err) {
            toast.error("Gagal memuat PDF");
            setPreviewOpen(false);
        } finally {
            setPdfLoading(false);
        }
    };

    const closePreview = () => {
        setPreviewOpen(false);
        setPdfDataUrl("");
    };

    if (loading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </AppShell>
        );
    }

    if (!service) {
        return (
            <AppShell>
                <div className="text-center text-slate-500">Service not found</div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/services">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Service Detail</h1>
                            <p className="text-slate-500 font-mono">{service.receiptNo}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {service.status === "UNPAID" && (
                            <Button variant="outline" onClick={handleMarkPaid}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Paid
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleGeneratePdf}>
                            <Printer className="h-4 w-4 mr-2" />
                            Generate PDFs
                        </Button>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={`p-4 rounded-lg ${service.status === "PAID" ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {service.status === "PAID" ? (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                                <Clock className="h-6 w-6 text-amber-600" />
                            )}
                            <div>
                                <p className={`font-semibold ${service.status === "PAID" ? "text-green-700" : "text-amber-700"}`}>
                                    {service.status === "PAID" ? "Payment Received" : "Awaiting Payment"}
                                </p>
                                {service.paidAt && (
                                    <p className="text-sm text-green-600">
                                        Paid on {formatAsWib(service.paidAt, "dd MMMM yyyy HH:mm")} WIB
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Total Amount</p>
                            <p className={`text-2xl font-bold ${service.status === "PAID" ? "text-green-700" : "text-amber-700"}`}>
                                {formatMoney(convertToDisplayCurrency(safeBigInt(service.netTotal), service.currency, service.exchangeRate), service.currency)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Flight Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Flight Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plane className="h-5 w-5" />
                                    Flight Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Airline / Operator</p>
                                        <p className="font-medium">{service.airline}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Flight Type</p>
                                        <Badge variant="outline" className={service.flightType === "DOM" ? "border-blue-300 text-blue-600" : "border-purple-300 text-purple-600"}>
                                            {service.flightType === "DOM" ? "Domestic" : "International"}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Flight Number</p>
                                        <p className="font-medium">{service.flightNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Registration</p>
                                        <p className="font-medium">{service.registration}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Aircraft Type</p>
                                        <p className="font-medium">{service.aircraftType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Route</p>
                                        <p className="font-medium">{service.depStation} → {service.arrStation}</p>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Time Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Arrival/Departure Date</p>
                                        <p className="font-medium">{formatAsWib(service.arrivalDate, "dd MMM yyyy")}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">
                                            {service.ataUtc ? "ATA (WIB / UTC)" : "ATD (WIB / UTC)"}
                                        </p>
                                        <p className="font-medium">
                                            {service.ataUtc ? (
                                                <>{formatAsWib(service.ataUtc, "HH:mm")} / {formatAsUtc(service.ataUtc, "HH:mm")}</>
                                            ) : service.atdUtc ? (
                                                <>{formatAsWib(service.atdUtc, "HH:mm")} / {formatAsUtc(service.atdUtc, "HH:mm")}</>
                                            ) : (
                                                "-"
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Service Start</p>
                                        <p className="font-medium">
                                            {formatAsWib(service.serviceStartUtc, "HH:mm")} / {formatAsUtc(service.serviceStartUtc, "HH:mm")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Service End</p>
                                        <p className="font-medium">
                                            {formatAsWib(service.serviceEndUtc, "HH:mm")} / {formatAsUtc(service.serviceEndUtc, "HH:mm")}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Billing Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Billing Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-slate-50">
                                                <th className="text-left py-3 px-4">Charge Type</th>
                                                <th className="text-left py-3 px-4">Start</th>
                                                <th className="text-left py-3 px-4">End</th>
                                                <th className="text-left py-3 px-4">Duration</th>
                                                <th className="text-right py-3 px-4">Rate</th>
                                                <th className="text-right py-3 px-4">Gross</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {service.useApp && (
                                                <tr className="border-b">
                                                    <td className="py-3 px-4">{service.advanceExtend} (APP)</td>
                                                    <td className="py-3 px-4">{formatAsUtc(service.serviceStartUtc, "HH:mm:ss")}</td>
                                                    <td className="py-3 px-4">{formatAsUtc(service.serviceEndUtc, "HH:mm:ss")}</td>
                                                    <td className="py-3 px-4">{service.billableHours} jam</td>
                                                    <td className="py-3 px-4 text-right">{formatMoney(convertToDisplayCurrency(UNIT_RATES.APP, service.currency, service.exchangeRate), service.currency)}</td>
                                                    <td className="py-3 px-4 text-right font-medium">{formatMoney(convertToDisplayCurrency(safeBigInt(service.grossApp), service.currency, service.exchangeRate), service.currency)}</td>
                                                </tr>
                                            )}
                                            {service.useTwr && (
                                                <tr className="border-b">
                                                    <td className="py-3 px-4">{service.advanceExtend} (TWR)</td>
                                                    <td className="py-3 px-4">{formatAsUtc(service.serviceStartUtc, "HH:mm:ss")}</td>
                                                    <td className="py-3 px-4">{formatAsUtc(service.serviceEndUtc, "HH:mm:ss")}</td>
                                                    <td className="py-3 px-4">{service.billableHours} jam</td>
                                                    <td className="py-3 px-4 text-right">{formatMoney(convertToDisplayCurrency(UNIT_RATES.TWR, service.currency, service.exchangeRate), service.currency)}</td>
                                                    <td className="py-3 px-4 text-right font-medium">{formatMoney(convertToDisplayCurrency(safeBigInt(service.grossTwr), service.currency, service.exchangeRate), service.currency)}</td>
                                                </tr>
                                            )}
                                            {service.useAfis && (
                                                <tr className="border-b">
                                                    <td className="py-3 px-4">{service.advanceExtend} (AFIS)</td>
                                                    <td className="py-3 px-4">{formatAsUtc(service.serviceStartUtc, "HH:mm:ss")}</td>
                                                    <td className="py-3 px-4">{formatAsUtc(service.serviceEndUtc, "HH:mm:ss")}</td>
                                                    <td className="py-3 px-4">{service.billableHours} jam</td>
                                                    <td className="py-3 px-4 text-right">{formatMoney(convertToDisplayCurrency(UNIT_RATES.AFIS, service.currency, service.exchangeRate), service.currency)}</td>
                                                    <td className="py-3 px-4 text-right font-medium">{formatMoney(convertToDisplayCurrency(safeBigInt(service.grossAfis), service.currency, service.exchangeRate), service.currency)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2">
                                                <td colSpan={5} className="py-2 px-4 text-right font-medium">Gross Total</td>
                                                <td className="py-2 px-4 text-right font-bold">{formatMoney(convertToDisplayCurrency(safeBigInt(service.grossTotal), service.currency, service.exchangeRate), service.currency)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={5} className="py-2 px-4 text-right font-medium">PPN 12%</td>
                                                <td className="py-2 px-4 text-right font-bold">{formatMoney(convertToDisplayCurrency(safeBigInt(service.ppn), service.currency, service.exchangeRate), service.currency)}</td>
                                            </tr>
                                            <tr className="bg-green-50">
                                                <td colSpan={5} className="py-3 px-4 text-right font-bold text-green-700">NET TOTAL</td>
                                                <td className="py-3 px-4 text-right font-bold text-green-700 text-lg">{formatMoney(convertToDisplayCurrency(safeBigInt(service.netTotal), service.currency, service.exchangeRate), service.currency)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600">
                                        <strong>Terbilang:</strong> {numberToWords(convertToDisplayCurrency(Number(service.netTotal), service.currency, service.exchangeRate), service.currency)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Actions & Info */}
                    <div className="space-y-6">
                        {/* PDF Downloads */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Documents
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Breakdown PDF */}
                                <div className="border rounded-lg p-3">
                                    <p className="font-medium text-sm mb-2">Breakdown (Lampiran 1)</p>
                                    <div className="flex gap-2">
                                        <Button variant="default" size="sm" className="flex-1" onClick={() => handlePreview("breakdown")}>
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const link = document.createElement("a");
                                                link.href = `/api/services/${service.id}/pdf/breakdown`;
                                                link.download = `Breakdown_${service.receiptNo}.pdf`;
                                                link.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Receipt PDF */}
                                <div className="border rounded-lg p-3">
                                    <p className="font-medium text-sm mb-2">Receipt (Lampiran 2)</p>
                                    <div className="flex gap-2">
                                        <Button variant="default" size="sm" className="flex-1" onClick={() => handlePreview("receipt")}>
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const link = document.createElement("a");
                                                link.href = `/api/services/${service.id}/pdf/receipt`;
                                                link.download = `Receipt_${service.receiptNo}.pdf`;
                                                link.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Combined PDF */}
                                <div className="border rounded-lg p-3 bg-blue-50">
                                    <p className="font-medium text-sm mb-2 text-blue-700">Combined (Both)</p>
                                    <div className="flex gap-2">
                                        <Button variant="default" size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handlePreview("combined")}>
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const link = document.createElement("a");
                                                link.href = `/api/services/${service.id}/pdf/combined`;
                                                link.download = `Invoice_${service.receiptNo}.pdf`;
                                                link.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Word Template */}
                                <div className="border rounded-lg p-3 bg-green-50">
                                    <p className="font-medium text-sm mb-2 text-green-700">Word Template</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => {
                                                const link = document.createElement("a");
                                                link.href = `/api/services/${service.id}/pdf/word`;
                                                link.download = `Invoice_${service.receiptNo.replace(/\./g, "_")}.pdf`;
                                                link.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            PDF
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-green-600 text-green-700 hover:bg-green-100"
                                            onClick={() => {
                                                const link = document.createElement("a");
                                                link.href = `/api/services/${service.id}/word`;
                                                link.download = `Invoice_${service.receiptNo.replace(/\./g, "_")}.docx`;
                                                link.click();
                                            }}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Word
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bank Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Bank Transfer Details</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div>
                                    <p className="text-slate-500">Bank Name</p>
                                    <p className="font-medium">{BANK_DETAILS.bankName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Branch</p>
                                    <p className="font-medium">{BANK_DETAILS.branchName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Account Name</p>
                                    <p className="font-medium">{BANK_DETAILS.accountName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Account Number</p>
                                    <p className="font-mono font-bold text-lg">{BANK_DETAILS.accountNumber}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Meta Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Record Info</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div>
                                    <p className="text-slate-500">Sequence No</p>
                                    <p className="font-medium">#{service.seqNo}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Receipt Date</p>
                                    <p className="font-medium">{formatAsWib(service.receiptDate, "dd MMMM yyyy")}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">PIC Dinas</p>
                                    <p className="font-medium">{service.picDinas || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Created</p>
                                    <p className="font-medium">{formatAsWib(service.createdAt, "dd MMM yyyy HH:mm")}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div >
            </div >

            {/* PDF Preview Modal */}
            {
                previewOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 rounded-t-lg">
                                <div className="flex items-center gap-4">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    <span className="font-semibold">
                                        {previewType === "breakdown" && "Breakdown (Lampiran 1)"}
                                        {previewType === "receipt" && "Receipt (Lampiran 2)"}
                                        {previewType === "combined" && "Combined Invoice"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Type Switcher */}
                                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                        <Button
                                            variant={previewType === "breakdown" ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => handlePreview("breakdown")}
                                        >
                                            Breakdown
                                        </Button>
                                        <Button
                                            variant={previewType === "receipt" ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => handlePreview("receipt")}
                                        >
                                            Receipt
                                        </Button>
                                        <Button
                                            variant={previewType === "combined" ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => handlePreview("combined")}
                                        >
                                            Combined
                                        </Button>
                                    </div>
                                    {/* Download Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const link = document.createElement("a");
                                            link.href = `/api/services/${service.id}/pdf/${previewType}`;
                                            link.download = `${previewType}_${service.receiptNo}.pdf`;
                                            link.click();
                                        }}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                    {/* Close Button */}
                                    <Button variant="ghost" size="sm" onClick={closePreview}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* PDF Viewer */}
                            <div className="flex-1 p-4 bg-slate-100 overflow-hidden">
                                {pdfLoading && (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                            <p className="text-gray-600">Memuat PDF...</p>
                                        </div>
                                    </div>
                                )}

                                {pdfDataUrl && !pdfLoading && (
                                    <iframe
                                        src={pdfDataUrl}
                                        className="w-full h-full rounded-lg shadow bg-white"
                                        title="PDF Preview"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </AppShell >
    );
}

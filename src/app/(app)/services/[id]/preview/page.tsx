"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText as FileIcon, RefreshCw } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ type?: string }>;
}

export default function PdfPreviewPage({ params, searchParams }: PageProps) {
    const resolvedParams = use(params);
    const resolvedSearchParams = use(searchParams);

    const serviceId = resolvedParams.id;
    const pdfType = resolvedSearchParams.type || "combined";

    const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const typeLabels: Record<string, string> = {
        breakdown: "Breakdown (Lampiran 1)",
        receipt: "Receipt (Lampiran 2)",
        combined: "Combined Invoice",
    };

    const loadPdf = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/services/${serviceId}/pdf/${pdfType}`, {
                cache: "no-store",
            });
            if (!res.ok) {
                throw new Error("Failed to load PDF");
            }
            const arrayBuffer = await res.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ""
                )
            );
            const dataUrl = `data:application/pdf;base64,${base64}`;
            setPdfDataUrl(dataUrl);
            setLoading(false);
        } catch (err) {
            setError("Gagal memuat PDF. Pastikan service valid.");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPdf();
    }, [serviceId, pdfType]);

    const handleDownload = async () => {
        try {
            const res = await fetch(`/api/services/${serviceId}/pdf/${pdfType}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${pdfType}_${serviceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Gagal download PDF");
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href={`/services/${serviceId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kembali
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <FileIcon className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold">{typeLabels[pdfType] || "PDF Preview"}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* PDF Type Switcher */}
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        <Link href={`/services/${serviceId}/preview?type=breakdown`}>
                            <Button
                                variant={pdfType === "breakdown" ? "default" : "ghost"}
                                size="sm"
                            >
                                Breakdown
                            </Button>
                        </Link>
                        <Link href={`/services/${serviceId}/preview?type=receipt`}>
                            <Button
                                variant={pdfType === "receipt" ? "default" : "ghost"}
                                size="sm"
                            >
                                Receipt
                            </Button>
                        </Link>
                        <Link href={`/services/${serviceId}/preview?type=combined`}>
                            <Button
                                variant={pdfType === "combined" ? "default" : "ghost"}
                                size="sm"
                            >
                                Combined
                            </Button>
                        </Link>
                    </div>
                    <Button onClick={loadPdf} variant="ghost" size="sm" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 p-4 overflow-hidden">
                {loading && (
                    <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Memuat PDF...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
                        <div className="text-center text-red-600">
                            <p className="text-lg font-medium">{error}</p>
                            <div className="flex gap-2 justify-center mt-4">
                                <Button onClick={loadPdf} variant="outline">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Coba Lagi
                                </Button>
                                <Link href={`/services/${serviceId}`}>
                                    <Button variant="default">
                                        Kembali ke Detail
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {pdfDataUrl && !loading && !error && (
                    <object
                        data={pdfDataUrl}
                        type="application/pdf"
                        className="w-full h-full rounded-lg shadow-lg bg-white"
                    >
                        <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
                            <div className="text-center">
                                <p className="text-gray-600 mb-4">
                                    Browser Anda tidak mendukung preview PDF.
                                </p>
                                <Button onClick={handleDownload} variant="default">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </Button>
                            </div>
                        </div>
                    </object>
                )}
            </div>
        </div>
    );
}

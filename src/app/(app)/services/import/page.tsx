"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PreviewRow {
    rowNumber: number;
    isValid: boolean;
    data: Record<string, unknown>;
    errors: string[];
}

interface PreviewResult {
    headers: string[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
    rows: PreviewRow[];
}

interface ImportResult {
    success: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    importedCount: number;
    errors: Array<{ row: number; message: string }>;
}

export default function ImportCsvPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [importing, setImporting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith(".csv")) {
            toast.error("Please select a CSV file");
            return;
        }

        setFile(selectedFile);
        setPreview(null);
        setResult(null);

        // Preview the file
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("preview", "true");

            const res = await fetch("/api/services/import-csv", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setPreview(data);
            } else {
                toast.error("Failed to parse CSV file");
            }
        } catch {
            toast.error("Error reading file");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("preview", "false");

            const res = await fetch("/api/services/import-csv", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data: ImportResult = await res.json();
                setResult(data);

                if (data.importedCount > 0) {
                    toast.success(`Successfully imported ${data.importedCount} services`);
                }

                if (data.errors.length > 0) {
                    toast.warning(`${data.errors.length} rows had errors`);
                }
            } else {
                toast.error("Import failed");
            }
        } catch {
            toast.error("Error during import");
        } finally {
            setImporting(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.endsWith(".csv")) {
            const input = document.getElementById("csv-input") as HTMLInputElement;
            const dt = new DataTransfer();
            dt.items.add(droppedFile);
            input.files = dt.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }, []);

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/services">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Import CSV</h1>
                        <p className="text-slate-500">Import flight services from CSV file</p>
                    </div>
                </div>

                {/* Upload Area */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upload CSV File</CardTitle>
                        <CardDescription>
                            Select or drag a CSV file with flight service data
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <input
                                id="csv-input"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label htmlFor="csv-input" className="cursor-pointer">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-4 bg-blue-50 rounded-full">
                                        <FileSpreadsheet className="h-10 w-10 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-700">
                                            {file ? file.name : "Click to upload or drag and drop"}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            CSV files only
                                        </p>
                                    </div>
                                    {file && (
                                        <Badge variant="outline" className="mt-2">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </Badge>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* CSV Format Help */}
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm">
                            <p className="font-medium text-slate-700 mb-2">Expected CSV Headers:</p>
                            <code className="text-xs text-slate-600 block overflow-x-auto">
                                airline_operator_gh, flight_type, flight_number, registration, aircraft_type,
                                departure, arrival, arrival_date, ata_utc, atd_utc, service_start_utc,
                                service_end_utc, advance_extend, unit_app, unit_twr, unit_afis, pic_dinas
                            </code>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading */}
                {loading && (
                    <Card>
                        <CardContent className="py-8">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                <span className="text-slate-600">Parsing CSV file...</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Preview */}
                {preview && !result && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Preview</span>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {preview.validRows} Valid
                                    </Badge>
                                    {preview.invalidRows > 0 && (
                                        <Badge variant="outline" className="bg-red-50 text-red-700">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            {preview.invalidRows} Invalid
                                        </Badge>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription>
                                {preview.totalRows} total rows found. Review before importing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Row</TableHead>
                                            <TableHead className="w-20">Status</TableHead>
                                            <TableHead>Airline</TableHead>
                                            <TableHead>Flight</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Units</TableHead>
                                            <TableHead>Errors</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.rows.map((row) => (
                                            <TableRow
                                                key={row.rowNumber}
                                                className={row.isValid ? "" : "bg-red-50"}
                                            >
                                                <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                                                <TableCell>
                                                    {row.isValid ? (
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-red-500" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {String(row.data.airline_operator_gh || "-")}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {String(row.data.flight_number || "-")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {String(row.data.flight_type || "-")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {String(row.data.arrival_date || "-")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {row.data.unit_app === "1" && <Badge className="text-xs bg-blue-100 text-blue-700">APP</Badge>}
                                                        {row.data.unit_twr === "1" && <Badge className="text-xs bg-green-100 text-green-700">TWR</Badge>}
                                                        {row.data.unit_afis === "1" && <Badge className="text-xs bg-purple-100 text-purple-700">AFIS</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {row.errors.length > 0 && (
                                                        <span className="text-xs text-red-600">
                                                            {row.errors.join(", ")}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            <div className="mt-4 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setFile(null);
                                        setPreview(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={importing || preview.validRows === 0}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Import {preview.validRows} Valid Rows
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Import Result */}
                {result && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {result.importedCount > 0 ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                )}
                                Import Complete
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-4 bg-slate-50 rounded-lg">
                                    <p className="text-2xl font-bold">{result.totalRows}</p>
                                    <p className="text-sm text-slate-500">Total Rows</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-700">{result.importedCount}</p>
                                    <p className="text-sm text-green-600">Imported</p>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                                    <p className="text-sm text-red-600">Errors</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="mb-4">
                                    <p className="font-medium text-slate-700 mb-2">Errors:</p>
                                    <ScrollArea className="h-[200px] bg-red-50 p-3 rounded-lg">
                                        {result.errors.map((err, idx) => (
                                            <p key={idx} className="text-sm text-red-600 mb-1">
                                                Row {err.row}: {err.message}
                                            </p>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setFile(null);
                                        setPreview(null);
                                        setResult(null);
                                    }}
                                >
                                    Import Another
                                </Button>
                                <Link href="/services">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        View Services
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}

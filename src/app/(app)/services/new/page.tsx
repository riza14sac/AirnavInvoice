"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2, Calculator, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, type Currency } from "@/lib/time/format";
import { UNIT_RATES } from "@/lib/config/rates";
import Link from "next/link";

export default function NewServicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
    const [preview, setPreview] = useState<{
        durationMinutes: number;
        billableHours: number;
        grossTotal: number;
        ppn: number;
        netTotal: number;
    } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        airline: "",
        flightType: "DOM",
        flightNumber: "",
        flightNumber2: "",
        registration: "",
        aircraftType: "",
        depStation: "",
        arrStation: "WITT",
        arrivalDate: "",
        ataTime: "",
        atdTime: "",
        advanceExtend: "EXTEND",
        serviceStartTime: "",
        serviceEndTime: "",
        useApp: false,
        useTwr: false,
        useAfis: false,
        currency: "IDR",
        exchangeRate: 0,
        picDinas: "",
    });

    const updateField = (field: string, value: string | boolean | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Fetch current exchange rate from API
    const fetchExchangeRate = useCallback(async () => {
        setExchangeRateLoading(true);
        try {
            const res = await fetch("/api/exchange-rate");
            if (res.ok) {
                const data = await res.json();
                updateField("exchangeRate", data.rate);
                toast.success(`Kurs loaded: 1 USD = Rp ${data.rate.toLocaleString("id-ID")}`);
            } else {
                toast.error("Failed to fetch exchange rate");
            }
        } catch (error) {
            console.error("Exchange rate fetch error:", error);
            toast.error("Error fetching exchange rate");
        } finally {
            setExchangeRateLoading(false);
        }
    }, []);

    const calculatePreview = () => {
        if (!formData.serviceStartTime || !formData.serviceEndTime) {
            setPreview(null);
            return;
        }

        const [startH, startM] = formData.serviceStartTime.split(":").map(Number);
        const [endH, endM] = formData.serviceEndTime.split(":").map(Number);

        let startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        // Handle day rollover
        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        const durationMinutes = endMinutes - startMinutes;
        const billableHours = Math.ceil(durationMinutes / 60);

        // Calculate gross total in Rupiah first
        let grossTotalIDR = 0;
        if (formData.useApp) grossTotalIDR += billableHours * UNIT_RATES.APP;
        if (formData.useTwr) grossTotalIDR += billableHours * UNIT_RATES.TWR;
        if (formData.useAfis) grossTotalIDR += billableHours * UNIT_RATES.AFIS;

        const ppnIDR = Math.floor(grossTotalIDR * 0.12);
        const netTotalIDR = grossTotalIDR + ppnIDR;

        // Convert to USD if currency is USD and exchange rate is available
        let grossTotal = grossTotalIDR;
        let ppn = ppnIDR;
        let netTotal = netTotalIDR;

        if (formData.currency === "USD" && formData.exchangeRate > 0) {
            grossTotal = grossTotalIDR / formData.exchangeRate;
            ppn = ppnIDR / formData.exchangeRate;
            netTotal = netTotalIDR / formData.exchangeRate;
        }

        setPreview({ durationMinutes, billableHours, grossTotal, ppn, netTotal });
    };

    // Auto-recalculate preview when form data changes
    useEffect(() => {
        calculatePreview();
    }, [formData.serviceStartTime, formData.serviceEndTime, formData.useApp, formData.useTwr, formData.useAfis, formData.currency, formData.exchangeRate]);

    // Auto-set currency based on flightType: DOM = IDR, INT = USD
    useEffect(() => {
        if (formData.flightType === "INT") {
            updateField("currency", "USD");
            // Auto-fetch exchange rate for international flights
            if (formData.exchangeRate === 0) {
                fetchExchangeRate();
            }
        } else {
            updateField("currency", "IDR");
        }
    }, [formData.flightType, fetchExchangeRate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.useApp && !formData.useTwr && !formData.useAfis) {
            toast.error("Please select at least one unit (APP, TWR, or AFIS)");
            return;
        }

        // Validate at least one of ATA or ATD
        if (!formData.ataTime && !formData.atdTime) {
            toast.error("Please fill either ATA (Arrival) or ATD (Departure) time");
            return;
        }

        setLoading(true);

        try {
            // Build UTC timestamps
            const arrivalDate = new Date(formData.arrivalDate);

            let ataUtc = null;
            if (formData.ataTime) {
                ataUtc = new Date(arrivalDate);
                const [ataH, ataM] = formData.ataTime.split(":").map(Number);
                ataUtc.setUTCHours(ataH, ataM, 0, 0);
            }

            let atdUtc = null;
            if (formData.atdTime) {
                atdUtc = new Date(arrivalDate);
                const [atdH, atdM] = formData.atdTime.split(":").map(Number);
                atdUtc.setUTCHours(atdH, atdM, 0, 0);
            }

            const serviceStartUtc = new Date(arrivalDate);
            const [startH, startM] = formData.serviceStartTime.split(":").map(Number);
            serviceStartUtc.setUTCHours(startH, startM, 0, 0);

            const serviceEndUtc = new Date(arrivalDate);
            const [endH, endM] = formData.serviceEndTime.split(":").map(Number);
            serviceEndUtc.setUTCHours(endH, endM, 0, 0);

            // Handle day rollover
            if (serviceEndUtc < serviceStartUtc) {
                serviceEndUtc.setUTCDate(serviceEndUtc.getUTCDate() + 1);
            }

            const payload = {
                airline: formData.airline,
                flightType: formData.flightType,
                flightNumber: formData.flightNumber,
                flightNumber2: formData.flightNumber2 || undefined,
                registration: formData.registration,
                aircraftType: formData.aircraftType,
                depStation: formData.depStation,
                arrStation: formData.arrStation,
                arrivalDate: arrivalDate.toISOString(),
                ataUtc: ataUtc?.toISOString(),
                atdUtc: atdUtc?.toISOString(),
                advanceExtend: formData.advanceExtend,
                serviceStartUtc: serviceStartUtc.toISOString(),
                serviceEndUtc: serviceEndUtc.toISOString(),
                useApp: formData.useApp,
                useTwr: formData.useTwr,
                useAfis: formData.useAfis,
                currency: formData.currency,
                exchangeRate: formData.currency === "USD" ? formData.exchangeRate : undefined,
                picDinas: formData.picDinas || undefined,
            };

            const res = await fetch("/api/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Service created! Receipt: ${data.receiptNo}`);
                router.push(`/services/${data.id}`);
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create service");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error creating service");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/services">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">New Service</h1>
                        <p className="text-slate-500">Input flight service billing data</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Flight Information */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                Flight Information
                                <span className="text-xs text-blue-500 font-normal">(Input Columns)</span>
                            </CardTitle>
                            <CardDescription>Basic flight and airline details</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Airline / Operator / Ground Handling *</Label>
                                <Input
                                    value={formData.airline}
                                    onChange={(e) => updateField("airline", e.target.value)}
                                    placeholder="PT. BATIK INDONESIA AIR"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Flight Type *</Label>
                                <Select value={formData.flightType} onValueChange={(v) => updateField("flightType", v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DOM">Domestic (DOM)</SelectItem>
                                        <SelectItem value="INT">International (INT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Flight Number *</Label>
                                <Input
                                    value={formData.flightNumber}
                                    onChange={(e) => updateField("flightNumber", e.target.value)}
                                    placeholder="BTK6898"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Flight Number 2 (Optional)</Label>
                                <Input
                                    value={formData.flightNumber2}
                                    onChange={(e) => updateField("flightNumber2", e.target.value)}
                                    placeholder=""
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Registration *</Label>
                                <Input
                                    value={formData.registration}
                                    onChange={(e) => updateField("registration", e.target.value)}
                                    placeholder="PK-LZH"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Aircraft Type *</Label>
                                <Input
                                    value={formData.aircraftType}
                                    onChange={(e) => updateField("aircraftType", e.target.value)}
                                    placeholder="A320"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Departure Station *</Label>
                                <Input
                                    value={formData.depStation}
                                    onChange={(e) => updateField("depStation", e.target.value)}
                                    placeholder="WIII"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Arrival Station *</Label>
                                <Input
                                    value={formData.arrStation}
                                    onChange={(e) => updateField("arrStation", e.target.value)}
                                    placeholder="WITT"
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Date and Time */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                Date & Time
                                <span className="text-xs text-slate-400 font-normal">(All times in UTC)</span>
                            </CardTitle>
                            <CardDescription>Flight arrival and service time details</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Arrival/Departure Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.arrivalDate}
                                    onChange={(e) => updateField("arrivalDate", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ATA (UTC)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="time"
                                        value={formData.ataTime}
                                        onChange={(e) => updateField("ataTime", e.target.value)}
                                        className="flex-1"
                                    />
                                    {formData.ataTime && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => updateField("ataTime", "")}
                                            title="Clear ATA"
                                        >
                                            ✕
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">Fill for Arrival</p>
                            </div>
                            <div className="space-y-2">
                                <Label>ATD (UTC)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="time"
                                        value={formData.atdTime}
                                        onChange={(e) => updateField("atdTime", e.target.value)}
                                        className="flex-1"
                                    />
                                    {formData.atdTime && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => updateField("atdTime", "")}
                                            title="Clear ATD"
                                        >
                                            ✕
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">Fill for Departure</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Advance / Extend *</Label>
                                <Select value={formData.advanceExtend} onValueChange={(v) => updateField("advanceExtend", v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADVANCE">ADVANCE</SelectItem>
                                        <SelectItem value="EXTEND">EXTEND</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Service Start (UTC) *</Label>
                                <Input
                                    type="time"
                                    value={formData.serviceStartTime}
                                    onChange={(e) => updateField("serviceStartTime", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Service End (UTC) *</Label>
                                <Input
                                    type="time"
                                    value={formData.serviceEndTime}
                                    onChange={(e) => updateField("serviceEndTime", e.target.value)}
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Units Selection */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                Service Units
                            </CardTitle>
                            <CardDescription>Select which units to bill (at least one required)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
                                    <Checkbox
                                        id="useApp"
                                        checked={formData.useApp}
                                        onCheckedChange={(checked) => updateField("useApp", checked as boolean)}
                                    />
                                    <div>
                                        <Label htmlFor="useApp" className="font-semibold cursor-pointer">APP</Label>
                                        <p className="text-xs text-slate-500">
                                            Rate: {formatMoney(UNIT_RATES.APP)}/jam
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
                                    <Checkbox
                                        id="useTwr"
                                        checked={formData.useTwr}
                                        onCheckedChange={(checked) => updateField("useTwr", checked as boolean)}
                                    />
                                    <div>
                                        <Label htmlFor="useTwr" className="font-semibold cursor-pointer">TWR</Label>
                                        <p className="text-xs text-slate-500">
                                            Rate: {formatMoney(UNIT_RATES.TWR)}/jam
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
                                    <Checkbox
                                        id="useAfis"
                                        checked={formData.useAfis}
                                        onCheckedChange={(checked) => updateField("useAfis", checked as boolean)}
                                    />
                                    <div>
                                        <Label htmlFor="useAfis" className="font-semibold cursor-pointer">AFIS</Label>
                                        <p className="text-xs text-slate-500">
                                            Rate: {formatMoney(UNIT_RATES.AFIS)}/jam
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Currency Info (Auto-set based on Flight Type) */}
                            <Separator className="my-4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
                                        <DollarSign className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">
                                            {formData.flightType === "INT" ? "USD (Dollar)" : "IDR (Rupiah)"}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-auto">
                                            Auto: {formData.flightType === "INT" ? "International" : "Domestic"}
                                        </span>
                                    </div>
                                </div>
                                {formData.flightType === "INT" && (
                                    <div className="space-y-2">
                                        <Label>Kurs (1 USD = Rp)</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center h-10 px-3 border rounded-md bg-slate-50">
                                                <span className="font-medium">
                                                    {formData.exchangeRate > 0
                                                        ? `Rp ${formData.exchangeRate.toLocaleString("id-ID")}`
                                                        : "Loading..."
                                                    }
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={fetchExchangeRate}
                                                disabled={exchangeRateLoading}
                                            >
                                                {exchangeRateLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    "Refresh"
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-green-600">
                                            Kurs dari ExchangeRate-API (real-time)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <Label>PIC Dinas (Petugas)</Label>
                                <Input
                                    value={formData.picDinas}
                                    onChange={(e) => updateField("picDinas", e.target.value)}
                                    placeholder="WIDYA ANGGRAINI"
                                    className="mt-2"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Calculation */}
                    {preview && (
                        <Card className="border-l-4 border-l-green-500 bg-green-50/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-green-600" />
                                    Calculation Preview
                                    <span className="text-xs text-green-600 font-normal">(Output Columns)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <p className="text-xs text-slate-500">Duration</p>
                                        <p className="font-bold text-lg">
                                            {Math.floor(preview.durationMinutes / 60)}h {preview.durationMinutes % 60}m
                                        </p>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <p className="text-xs text-slate-500">Billable Hours</p>
                                        <p className="font-bold text-lg">{preview.billableHours} jam</p>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <p className="text-xs text-slate-500">Gross Total</p>
                                        <p className="font-bold text-lg">{formatMoney(preview.grossTotal, formData.currency as Currency)}</p>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <p className="text-xs text-slate-500">PPN 12%</p>
                                        <p className="font-bold text-lg">{formatMoney(preview.ppn, formData.currency as Currency)}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-100 rounded-lg">
                                        <p className="text-xs text-green-600">Net Total</p>
                                        <p className="font-bold text-xl text-green-700">{formatMoney(preview.netTotal, formData.currency as Currency)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end gap-4">
                        <Link href="/services">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Create Service
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </AppShell>
    );
}

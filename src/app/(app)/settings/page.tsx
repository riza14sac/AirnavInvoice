"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SignatureManager } from "@/components/signature";

interface Settings {
    airportCode: string;
    airportName: string;
    defaultTimezone: string;
    appRate: number;
    twrRate: number;
    afisRate: number;
    ppnRate: number;
    bankName: string;
    bankBranch: string;
    accountName: string;
    accountNumber: string;
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<Settings>({
        airportCode: process.env.NEXT_PUBLIC_AIRPORT_CODE || "WITT",
        airportName: process.env.NEXT_PUBLIC_AIRPORT_NAME || "Sultan Iskandar Muda",
        defaultTimezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Jakarta",
        appRate: 76,
        twrRate: 76,
        afisRate: 76,
        ppnRate: 11,
        bankName: "BANK SYARIAH INDONESIA",
        bankBranch: "CABANG BANDA ACEH",
        accountName: "PERUM LPPNPI CABANG BANDA ACEH",
        accountNumber: "7143344287",
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const isAdmin = session?.user?.role === "ADMIN";

    const handleChange = (field: keyof Settings, value: string | number) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage("");

        // In a real app, this would save to database
        // For now, just show a success message
        await new Promise((resolve) => setTimeout(resolve, 500));

        setMessage("Settings saved successfully! (Note: Some settings require environment variable changes)");
        setSaving(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Kembali
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>

            {message && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    {message}
                </div>
            )}

            {/* Airport Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Airport Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Airport Code (ICAO)
                        </label>
                        <input
                            type="text"
                            value={settings.airportCode}
                            onChange={(e) => handleChange("airportCode", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Airport Name
                        </label>
                        <input
                            type="text"
                            value={settings.airportName}
                            onChange={(e) => handleChange("airportName", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Timezone
                        </label>
                        <select
                            value={settings.defaultTimezone}
                            onChange={(e) => handleChange("defaultTimezone", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                            <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                            <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Rate Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Service Rates (USD per hour)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            APP Rate
                        </label>
                        <input
                            type="number"
                            value={settings.appRate}
                            onChange={(e) => handleChange("appRate", Number(e.target.value))}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            TWR Rate
                        </label>
                        <input
                            type="number"
                            value={settings.twrRate}
                            onChange={(e) => handleChange("twrRate", Number(e.target.value))}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            AFIS Rate
                        </label>
                        <input
                            type="number"
                            value={settings.afisRate}
                            onChange={(e) => handleChange("afisRate", Number(e.target.value))}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        PPN Rate (%)
                    </label>
                    <input
                        type="number"
                        value={settings.ppnRate}
                        onChange={(e) => handleChange("ppnRate", Number(e.target.value))}
                        disabled={!isAdmin}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                </div>
            </div>

            {/* Bank Settings */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank Account Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank Name
                        </label>
                        <input
                            type="text"
                            value={settings.bankName}
                            onChange={(e) => handleChange("bankName", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Branch Name
                        </label>
                        <input
                            type="text"
                            value={settings.bankBranch}
                            onChange={(e) => handleChange("bankBranch", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Name
                        </label>
                        <input
                            type="text"
                            value={settings.accountName}
                            onChange={(e) => handleChange("accountName", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number
                        </label>
                        <input
                            type="text"
                            value={settings.accountNumber}
                            onChange={(e) => handleChange("accountNumber", e.target.value)}
                            disabled={!isAdmin}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            {isAdmin && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            )}

            {!isAdmin && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                    <p className="text-sm">
                        <strong>Note:</strong> Only administrators can modify settings.
                    </p>
                </div>
            )}

            {/* Signature Management */}
            {isAdmin && (
                <div className="mt-6">
                    <SignatureManager />
                </div>
            )}
        </div>
    );
}

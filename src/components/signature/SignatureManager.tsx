"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignaturePad } from "./SignaturePad";
import { SignatureUpload } from "./SignatureUpload";
import { PenTool, Upload, User, Building } from "lucide-react";
import { toast } from "sonner";

interface Signature {
    id: string;
    name: string;
    title?: string;
    type: "PIC_DINAS" | "KEPALA_BANDARA";
    imageData: string;
}

export function SignatureManager() {
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [activeTab, setActiveTab] = useState<"PIC_DINAS" | "KEPALA_BANDARA">("PIC_DINAS");
    const [inputMode, setInputMode] = useState<"draw" | "upload">("draw");
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [imageData, setImageData] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSignatures();
    }, []);

    const fetchSignatures = async () => {
        try {
            const res = await fetch("/api/signatures");
            if (res.ok) {
                const data = await res.json();
                setSignatures(data);
            }
        } catch (err) {
            console.error("Error fetching signatures:", err);
        }
    };

    const getCurrentSignature = (type: "PIC_DINAS" | "KEPALA_BANDARA") => {
        return signatures.find((s) => s.type === type);
    };

    const handleSave = async () => {
        if (!name || !imageData) {
            toast.error("Nama dan tanda tangan harus diisi");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/signatures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    title,
                    type: activeTab,
                    imageData,
                }),
            });

            if (res.ok) {
                toast.success("Tanda tangan berhasil disimpan");
                fetchSignatures();
                setName("");
                setTitle("");
                setImageData("");
            } else {
                toast.error("Gagal menyimpan tanda tangan");
            }
        } catch (err) {
            toast.error("Error menyimpan tanda tangan");
        } finally {
            setLoading(false);
        }
    };

    const picSignature = getCurrentSignature("PIC_DINAS");
    const kepalaSignature = getCurrentSignature("KEPALA_BANDARA");

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Kelola Tanda Tangan PDF
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="PIC_DINAS" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            PIC Dinas
                        </TabsTrigger>
                        <TabsTrigger value="KEPALA_BANDARA" className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Kepala Bandara
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="PIC_DINAS">
                        <SignatureForm
                            currentSignature={picSignature}
                            name={name}
                            setName={setName}
                            title={title}
                            setTitle={setTitle}
                            inputMode={inputMode}
                            setInputMode={setInputMode}
                            imageData={imageData}
                            setImageData={setImageData}
                            onSave={handleSave}
                            loading={loading}
                            label="PIC Dinas"
                        />
                    </TabsContent>

                    <TabsContent value="KEPALA_BANDARA">
                        <SignatureForm
                            currentSignature={kepalaSignature}
                            name={name}
                            setName={setName}
                            title={title}
                            setTitle={setTitle}
                            inputMode={inputMode}
                            setInputMode={setInputMode}
                            imageData={imageData}
                            setImageData={setImageData}
                            onSave={handleSave}
                            loading={loading}
                            label="Kepala Bandara"
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

interface SignatureFormProps {
    currentSignature?: Signature;
    name: string;
    setName: (v: string) => void;
    title: string;
    setTitle: (v: string) => void;
    inputMode: "draw" | "upload";
    setInputMode: (v: "draw" | "upload") => void;
    imageData: string;
    setImageData: (v: string) => void;
    onSave: () => void;
    loading: boolean;
    label: string;
}

function SignatureForm({
    currentSignature,
    name,
    setName,
    title,
    setTitle,
    inputMode,
    setInputMode,
    imageData,
    setImageData,
    onSave,
    loading,
    label,
}: SignatureFormProps) {
    return (
        <div className="space-y-4">
            {/* Current Signature Display */}
            {currentSignature && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-2">
                        Tanda Tangan Aktif:
                    </p>
                    <div className="flex items-center gap-4">
                        <img
                            src={currentSignature.imageData}
                            alt="Current signature"
                            className="max-h-16 border rounded"
                        />
                        <div>
                            <p className="font-medium">{currentSignature.name}</p>
                            <p className="text-sm text-gray-500">{currentSignature.title}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Form */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Nama {label}</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nama lengkap"
                        />
                    </div>
                    <div>
                        <Label>Jabatan</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Jabatan (opsional)"
                        />
                    </div>
                </div>

                {/* Input Mode Toggle */}
                <div className="flex gap-2">
                    <Button
                        variant={inputMode === "draw" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInputMode("draw")}
                    >
                        <PenTool className="h-4 w-4 mr-2" />
                        Gambar
                    </Button>
                    <Button
                        variant={inputMode === "upload" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInputMode("upload")}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                    </Button>
                </div>

                {/* Signature Input */}
                {inputMode === "draw" ? (
                    <SignaturePad onSave={setImageData} />
                ) : (
                    <SignatureUpload onUpload={setImageData} currentImage={imageData} />
                )}

                {/* Save Button */}
                <Button onClick={onSave} disabled={loading || !name || !imageData}>
                    {loading ? "Menyimpan..." : `Simpan Tanda Tangan ${label}`}
                </Button>
            </div>
        </div>
    );
}

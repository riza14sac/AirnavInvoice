"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image, X } from "lucide-react";

interface SignatureUploadProps {
    onUpload: (imageData: string) => void;
    currentImage?: string;
}

export function SignatureUpload({ onUpload, currentImage }: SignatureUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentImage || null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Hanya file gambar yang diperbolehkan");
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("Ukuran file maksimal 2MB");
            return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setPreview(base64);
            onUpload(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const clearImage = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-3">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
            />

            {preview ? (
                <div className="relative border-2 border-gray-200 rounded-lg p-4 bg-white">
                    <img
                        src={preview}
                        alt="Signature preview"
                        className="max-h-32 mx-auto"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={clearImage}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    onClick={handleClick}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                        Klik untuk upload gambar tanda tangan
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        PNG atau JPG, maksimal 2MB
                    </p>
                </div>
            )}

            {preview && (
                <Button variant="outline" size="sm" onClick={handleClick}>
                    <Image className="h-4 w-4 mr-2" />
                    Ganti Gambar
                </Button>
            )}
        </div>
    );
}

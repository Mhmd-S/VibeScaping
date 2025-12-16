'use client';

import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeneratedImage } from '@/app/types/annotation';

interface ImageUploaderProps {
    onImageSelect: (image: GeneratedImage) => void;
    onError?: (error: string) => void;
    maxSizeMB?: number;
    acceptedFormats?: string[];
}

export const ImageUploader = ({
    onImageSelect,
    onError,
    maxSizeMB = 10,
    acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
}: ImageUploaderProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const validateFile = (file: File): string | null => {
        if (!acceptedFormats.includes(file.type)) {
            return `Invalid file type. Accepted formats: ${acceptedFormats.join(', ')}`;
        }

        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return `File size exceeds ${maxSizeMB}MB limit`;
        }

        return null;
    };

    const processFile = useCallback(
        (file: File) => {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                onError?.(validationError);
                return;
            }

            setError(null);

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    setPreview(result);
                    onImageSelect({
                        image: result,
                        mimeType: file.type,
                    });
                }
            };
            reader.onerror = () => {
                const errorMsg = 'Failed to read file';
                setError(errorMsg);
                onError?.(errorMsg);
            };
            reader.readAsDataURL(file);
        },
        [onImageSelect, onError, maxSizeMB, acceptedFormats],
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                processFile(file);
            }
        },
        [processFile],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
                processFile(file);
            }
        },
        [processFile],
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClear = useCallback(() => {
        setPreview(null);
        setError(null);
    }, []);

    return (
        <div className="w-full">
            {preview ? (
                <div className="relative">
                    <img
                        src={preview}
                        alt="Preview"
                        className="max-h-64 w-full rounded-lg border border-border object-contain"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                        isDragging
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-primary/50'
                    }`}
                >
                    <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 text-sm font-medium text-card-foreground">
                        Drop an image here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Supported formats: PNG, JPEG, WebP (max {maxSizeMB}MB)
                    </p>
                    <input
                        type="file"
                        accept={acceptedFormats.join(',')}
                        onChange={handleFileSelect}
                        className="hidden"
                        id="image-upload"
                    />
                    <label htmlFor="image-upload">
                        <Button type="button" variant="outline" className="mt-4" asChild>
                            <span>Select Image</span>
                        </Button>
                    </label>
                </div>
            )}

            {error && (
                <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};


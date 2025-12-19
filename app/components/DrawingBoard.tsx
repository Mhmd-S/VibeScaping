"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useImperativeHandle, useState, forwardRef, useCallback } from "react";
import { Excalidraw, exportToCanvas } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  BinaryFileData,
} from "@excalidraw/excalidraw/types";
import { GeneratedImage } from "../types/annotation";

const publicImageBaseUrl =
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
  process.env.CLOUDFLARE_R2_PUBLIC_URL;

const toPublicImageUrl = (originalUrl?: string | null) => {
  if (!originalUrl) return undefined;
  if (!publicImageBaseUrl) return originalUrl;

  try {
    const parsed = new URL(originalUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length === 0) return originalUrl;

    const keyPath =
      segments[0] === "projects"
        ? segments.join("/")
        : segments.slice(1).join("/") || segments[0];
    const normalizedBase = publicImageBaseUrl.replace(/\/$/, "");

    return `${normalizedBase}/${keyPath}`;
  } catch (error) {
    console.warn(
      "Failed to build public image URL, falling back to original",
      error
    );
    return originalUrl;
  }
};

const resolveImageSource = (image?: GeneratedImage | null): string => {
  if (!image?.image) return "";

  const raw = image.image;

  if (raw.startsWith("data:")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const publicUrl = toPublicImageUrl(raw) || raw;
      try {
        const publicParsed = new URL(publicUrl);
        if (
          publicParsed.hostname.includes("r2.dev") ||
          publicParsed.hostname.includes("cloudflarestorage.com")
        ) {
          return `/api/proxy-image?url=${encodeURIComponent(publicUrl)}`;
        }
      } catch {
        if (
          parsed.hostname.includes("r2.dev") ||
          parsed.hostname.includes("cloudflarestorage.com")
        ) {
          return `/api/proxy-image?url=${encodeURIComponent(publicUrl)}`;
        }
      }
      return publicUrl;
    }
  } catch {
    // Not a URL; treat as base64 below.
  }

  const mimeType = image.mimeType || "image/png";
  return `data:${mimeType};base64,${raw}`;
};

export interface DrawingBoardProps {
  initialImage?: GeneratedImage | null;
  onImageUpdate?: (image: GeneratedImage) => void;
  onError?: (message: string) => void;
}

export interface DrawingBoardRef {
  exportCanvasAsImage: () => Promise<{
    image: string;
    mimeType: string;
  } | null>;
  setImage: (image: GeneratedImage) => void;
  clearAnnotations: () => void;
}

export const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(
  ({ initialImage, onError }, ref) => {
    const [excalidrawAPI, setExcalidrawAPI] =
      useState<ExcalidrawImperativeAPI | null>(null);

    const loadImage = useCallback(async (image: GeneratedImage) => {
      if (!excalidrawAPI) return;

      try {
        const imageSrc = resolveImageSource(image);
        if (!imageSrc) return;

        let dataURL: string;
        const mimeType = (image.mimeType || "image/png") as BinaryFileData["mimeType"];

        if (imageSrc.startsWith("data:")) {
          dataURL = imageSrc;
        } else {
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          const reader = new FileReader();
          dataURL = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        // Generate unique IDs for file and element
        const fileId = `image-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const elementId = `image-element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add the image data to Excalidraw's internal file storage
        await excalidrawAPI.addFiles([
          {
            id: fileId,
            dataURL,
            mimeType,
          } as BinaryFileData,
        ]);

        // Get existing elements
        const existingElements = excalidrawAPI.getSceneElements();

        // Create the image element
        const imageElement = {
          type: 'image',
          version: 2,
          versionNonce: Date.now(),
          id: elementId,
          x: 100,
          y: 100,
          width: 500,
          height: 500,
          angle: 0,
          strokeColor: '#000000',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 1,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: Date.now(),
          fileId: fileId,
          status: 'loaded',
        } as any;

        // Update the scene with the new image element
        excalidrawAPI.updateScene({
          elements: [imageElement, ...existingElements],
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load image";
        onError?.(errorMessage);
      }
    }, [excalidrawAPI, onError]);

    useEffect(() => {
      if (excalidrawAPI && initialImage) {
        loadImage(initialImage);
      }
    }, [excalidrawAPI, loadImage]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        exportCanvasAsImage: async () => {
          console.log("Excalidraw API", excalidrawAPI);
          if (!excalidrawAPI) return null;

          console.log("Exporting canvas as image");

          try {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const files = excalidrawAPI.getFiles();

            console.log("Elements", elements);
            console.log("App State", appState);
            console.log("Files", files);

            // Export to canvas
            const canvas = await exportToCanvas({
              elements,
              appState,
              files,
              getDimensions: (width: number, height: number) => ({
                width,
                height,
                scale: 1,
              }),
            });

            console.log("Canvas", canvas);

            const dataUrl = canvas.toDataURL("image/png");
            const base64 = dataUrl.split(",")[1];
            const firstFile = Object.values(files)[0];
            const mimeType = firstFile?.mimeType || "image/png";

            return {
              image: base64,
              mimeType,
            };
          } catch (err) {
            console.log("The err", err);
            return null;
          }
        },
        setImage: (image: GeneratedImage) => {
          loadImage(image);
        },
        clearAnnotations: () => {
          if (!excalidrawAPI) return;

          const elements = excalidrawAPI.getSceneElements();
          // Keep only the image element, remove all other elements
          const imageElements = elements.filter(
            (el: any) => el.type === "image"
          );
          excalidrawAPI.updateScene({
            elements: imageElements,
          });
        },
      }),
      [excalidrawAPI, loadImage, onError]
    );

    return (
      <div className="w-full h-[calc(100vh-120px)] border-2 rounded-lg border-border bg-card p-1">
        <Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />
      </div>
    );
  }
);

export default DrawingBoard;

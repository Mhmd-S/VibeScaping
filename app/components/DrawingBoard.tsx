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
  workspaceId?: string;
  onFirstDraw?: () => void;
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
  ({ initialImage, onError, workspaceId, onFirstDraw }, ref) => {
    const [excalidrawAPI, setExcalidrawAPI] =
      useState<ExcalidrawImperativeAPI | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);

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

        // Load image to get natural dimensions
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = dataURL;
        });

        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // Get existing elements and files first
        const existingElements = excalidrawAPI.getSceneElements();
        const existingFiles = excalidrawAPI.getFiles();
        
        // Remove existing image elements and their associated files
        const nonImageElements = existingElements.filter(
          (el: any) => el.type !== 'image'
        );
        
        // Collect file IDs from existing image elements to clean them up
        const oldImageFileIds = new Set<string>();
        existingElements.forEach((el: any) => {
          if (el.type === 'image' && el.fileId) {
            oldImageFileIds.add(el.fileId);
          }
        });

        // Generate unique IDs for file and element
        const fileId = `image-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const elementId = `image-element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add the new image data to Excalidraw's internal file storage
        await excalidrawAPI.addFiles([
          {
            id: fileId,
            dataURL,
            mimeType,
          } as BinaryFileData,
        ]);

        // Create the image element with all required properties
        // Using proper Excalidraw image element structure
        const imageElement = {
          type: 'image',
          version: 2,
          versionNonce: Math.floor(Math.random() * 2 ** 32),
          id: elementId,
          x: 100,
          y: 100,
          width: naturalWidth,
          height: naturalHeight,
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
          seed: Math.floor(Math.random() * 2 ** 32),
          fileId: fileId,
          locked: false,
        } as any;

        // Wait a bit to ensure files are properly registered in Excalidraw
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get fresh state after file registration
        const currentElements = excalidrawAPI.getSceneElements();
        const currentNonImageElements = currentElements.filter(
          (el: any) => el.type !== 'image'
        );
        const appState = excalidrawAPI.getAppState();
        
        // Update scene with new image element and all non-image elements
        // Using requestAnimationFrame to ensure Excalidraw is ready
        requestAnimationFrame(() => {
          excalidrawAPI.updateScene({
            elements: [imageElement, ...currentNonImageElements],
            appState: {
              ...appState,
              selectedElementIds: {},
            },
          });
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

          try {
            const elements = excalidrawAPI.getSceneElements();
            
            // Keep only the image element, remove all other elements
            const imageElements = elements.filter(
              (el: any) => el.type === "image"
            );
            
            const appState = excalidrawAPI.getAppState();
            
            // Update scene - passing only image elements will remove others
            // Excalidraw handles the element lifecycle internally
            excalidrawAPI.updateScene({
              elements: imageElements,
              appState: {
                ...appState,
                selectedElementIds: {},
              },
            });
          } catch (err) {
            console.warn('Failed to clear annotations:', err);
            // Fallback: try clearing everything if filtering fails
            try {
              const appState = excalidrawAPI.getAppState();
              excalidrawAPI.updateScene({
                elements: [],
                appState: {
                  ...appState,
                  selectedElementIds: {},
                },
              });
            } catch (fallbackErr) {
              console.error('Fallback clear failed:', fallbackErr);
            }
          }
        },
      }),
      [excalidrawAPI, loadImage, onError]
    );

    // Handle Excalidraw onChange to detect first draw
    const handleExcalidrawChange = useCallback((elements: readonly any[], appState: any, files: any) => {
      // Check if there are any non-image elements (user has drawn something)
      const hasNonImageElements = elements.some((el: any) => el.type !== 'image');
      
      if (hasNonImageElements && !hasDrawn && onFirstDraw) {
        setHasDrawn(true);
        onFirstDraw();
      }
    }, [hasDrawn, onFirstDraw]);

    // Get workspace-specific storage key
    const getStorageKey = useCallback(() => {
      if (workspaceId) {
        return `excalidraw_workspace_${workspaceId}`;
      }
      return undefined; // Use default Excalidraw storage
    }, [workspaceId]);

    // Load initial data from workspace-specific storage
    const loadInitialData = useCallback(() => {
      if (!workspaceId || typeof window === 'undefined') return undefined;
      
      try {
        const storageKey = getStorageKey();
        if (!storageKey) return undefined;
        
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load workspace data:', error);
      }
      return undefined;
    }, [workspaceId, getStorageKey]);

    // Save to workspace-specific storage
    const saveToStorage = useCallback((elements: readonly any[], appState: any, files: any) => {
      if (!workspaceId || typeof window === 'undefined') return;
      
      try {
        const storageKey = getStorageKey();
        if (!storageKey) return;
        
        const data = {
          elements,
          appState,
          files,
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save workspace data:', error);
      }
    }, [workspaceId, getStorageKey]);

    // Set up change handler when API is ready
    useEffect(() => {
      if (!excalidrawAPI) return;

      // Load initial data
      const initialData = loadInitialData();
      if (initialData) {
        excalidrawAPI.updateScene({
          elements: initialData.elements || [],
          appState: initialData.appState || {},
        });
      }

      // Set up periodic save (Excalidraw doesn't have a direct onChange prop, so we'll use a workaround)
      const interval = setInterval(() => {
        if (excalidrawAPI) {
          const elements = excalidrawAPI.getSceneElements();
          const appState = excalidrawAPI.getAppState();
          const files = excalidrawAPI.getFiles();
          
          // Check for first draw
          const hasNonImageElements = elements.some((el: any) => el.type !== 'image');
          if (hasNonImageElements && !hasDrawn && onFirstDraw) {
            setHasDrawn(true);
            onFirstDraw();
          }
          
          // Save to storage
          saveToStorage(elements, appState, files);
        }
      }, 1000); // Save every second

      return () => clearInterval(interval);
    }, [excalidrawAPI, workspaceId, hasDrawn, onFirstDraw, loadInitialData, saveToStorage]);

    return (
      <div className="w-full h-[calc(100vh-15px)] shadow-lg border border-border rounded-lg  p-1">
        <Excalidraw 
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleExcalidrawChange}
        />
      </div>
    );
  }
);

export default DrawingBoard;

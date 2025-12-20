"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useImperativeHandle, useState, forwardRef, useCallback } from "react";
import { Excalidraw, exportToCanvas } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  BinaryFileData,
} from "@excalidraw/excalidraw/types";
import { GeneratedImage } from "../types/annotation";

export interface DrawingBoardRef {
  exportCanvasAsImage: () => Promise<{ image: string; mimeType: string } | null>;
  exportSelectedElementsAsImage: () => Promise<{ image: string; mimeType: string } | null>;
  hasSelectedElements: () => boolean;
  setImage: (image: GeneratedImage) => void;
}

export const DrawingBoard = forwardRef<any, any>(
  ({ initialImage, onError, workspaceId, onFirstDraw, onSelectionChange }, ref) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);

    const getStorageKey = useCallback(() => (workspaceId ? `excalidraw_workspace_${workspaceId}` : null), [workspaceId]);

    // Helper to extract IDs from the selectedElementIds (which can be an Object or a Set)
    const getSelectedIds = (selectedElementIds: any): string[] => {
      if (!selectedElementIds) return [];
      if (selectedElementIds instanceof Set) return Array.from(selectedElementIds);
      if (typeof selectedElementIds === 'object') {
        return Object.keys(selectedElementIds).filter(id => selectedElementIds[id]);
      }
      return [];
    };

    const loadImage = useCallback(async (image: GeneratedImage) => {
      if (!excalidrawAPI) return;

      try {
        const dataURL = image.image;
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
          img.src = dataURL;
        });

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const elementId = `el_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        excalidrawAPI.addFiles([{
          id: fileId,
          dataURL,
          mimeType: (image.mimeType || "image/png") as any,
        }]);

        const appState = excalidrawAPI.getAppState();
        const centerX = (appState.width / 2 - img.naturalWidth / 2) / appState.zoom.value - appState.scrollX;
        const centerY = (appState.height / 2 - img.naturalHeight / 2) / appState.zoom.value - appState.scrollY;

        // FIXED: Complete property set to prevent resizing TypeErrors
        const imageElement: any = {
          type: "image",
          id: elementId,
          status: "saved",
          fileId: fileId,
          x: centerX,
          y: centerY,
          width: img.naturalWidth,
          height: img.naturalHeight,
          strokeColor: "transparent",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          angle: 0,
          version: 1,
          versionNonce: Math.floor(Math.random() * 2 ** 32),
          seed: Math.floor(Math.random() * 2 ** 32),
          groupIds: [],
          frameId: null,
          roundness: null,
          isDeleted: false,
          boundElements: [], // MUST be an empty array, not null
          updated: Date.now(),
          link: null,
          locked: false,
        };

        const currentElements = excalidrawAPI.getSceneElements();
        excalidrawAPI.updateScene({
          elements: [...currentElements, imageElement],
          commitToHistory: true,
        });

      } catch (err) {
        onError?.("Failed to insert image");
      }
    }, [excalidrawAPI, onError]);

    const handleExcalidrawChange = useCallback((elements: readonly any[], appState: any, files: any) => {
      // 1. Detect if something was drawn
      if (!hasDrawn && onFirstDraw) {
        const hasContent = elements.some(el => !el.isDeleted && el.type !== 'image');
        if (hasContent) {
          setHasDrawn(true);
          onFirstDraw();
        }
      }

      // 2. Notify selection changes (handling both Set and Object structures)
      if (onSelectionChange) {
        const selectedIds = getSelectedIds(appState.selectedElementIds);
        onSelectionChange(selectedIds.length > 0);
      }

      // 3. Save to local storage
      const key = getStorageKey();
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify({ elements, files }));
        } catch (e) {
          console.warn("Local storage full or inaccessible", e);
        }
      }
    }, [hasDrawn, onFirstDraw, onSelectionChange, getStorageKey]);

    useImperativeHandle(ref, () => ({
      exportCanvasAsImage: async () => {
        if (!excalidrawAPI) return null;
        const elements = excalidrawAPI.getSceneElements().filter(el => !el.isDeleted);
        const canvas = await exportToCanvas({
          elements,
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles(),
        });
        return { image: canvas.toDataURL("image/png").split(",")[1], mimeType: "image/png" };
      },
      exportSelectedElementsAsImage: async () => {
        if (!excalidrawAPI) return null;
        const appState = excalidrawAPI.getAppState();
        const selectedIds = getSelectedIds(appState.selectedElementIds);
        const elements = excalidrawAPI.getSceneElements().filter(el => selectedIds.includes(el.id) && !el.isDeleted);
        
        if (elements.length === 0) return null;

        const canvas = await exportToCanvas({
          elements,
          appState,
          files: excalidrawAPI.getFiles(),
        });
        return { image: canvas.toDataURL("image/png").split(",")[1], mimeType: "image/png" };
      },
      hasSelectedElements: () => {
        if (!excalidrawAPI) return false;
        return getSelectedIds(excalidrawAPI.getAppState().selectedElementIds).length > 0;
      },
      setImage: (image: GeneratedImage) => loadImage(image),
    }), [excalidrawAPI, loadImage]);

    useEffect(() => {
      if (!excalidrawAPI) return;
      const key = getStorageKey();
      if (key) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const { elements, files } = JSON.parse(saved);
            if (files) excalidrawAPI.addFiles(Object.values(files));
            excalidrawAPI.updateScene({ elements });
          } catch (e) {
            console.error("Restore failed", e);
          }
        }
      }
      if (initialImage) loadImage(initialImage);
    }, [excalidrawAPI]);

    return (
      <div className="w-full h-[calc(100vh-15px)] shadow-lg border border-border rounded-lg p-1 customStylesExcalidraw">
        <Excalidraw 
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleExcalidrawChange}
        />
      </div>
    );
  }
);

export default DrawingBoard;
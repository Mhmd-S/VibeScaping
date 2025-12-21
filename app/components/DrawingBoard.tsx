"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useImperativeHandle, useState, forwardRef, useCallback, useRef } from "react";
import { Excalidraw, exportToCanvas } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  BinaryFileData,
} from "@excalidraw/excalidraw/types";
import { GeneratedImage } from "../types/annotation";
import { saveWorkspaceData, getWorkspaceData } from "@/app/utils/db";

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
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // CRITICAL: Track the ID that is currently "active" in the UI to prevent cross-saving
    const activeLoadedId = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
          id: fileId as any,
          dataURL: dataURL as any,
          mimeType: (image.mimeType || "image/png") as any,
          created: Date.now(),
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
        });

      } catch (err) {
        onError?.("Failed to insert image");
      }
    }, [excalidrawAPI, onError]);

    // --- Persistence Logic ---
    const persist = useCallback((elements: any, appState: any, files: any) => {
        // GUARD: Don't save if we are currently switching workspaces
        if (isLoading || !activeLoadedId.current) return;
        
        const id = workspaceId || 'anonymous_temp';
        
        // Ensure we are saving to the ID we actually intend to
        if (id !== activeLoadedId.current) return;
        
        // Debounce saving to IndexedDB for performance
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveWorkspaceData(id, { 
                    elements: elements.filter((el: any) => !el.isDeleted), 
                    files,
                    // Only save essential UI state
                    appState: {
                        viewBackgroundColor: appState.viewBackgroundColor,
                        zoom: appState.zoom,
                        scrollX: appState.scrollX,
                        scrollY: appState.scrollY
                    }
                });
            } catch (e) {
                console.error('IndexedDB Save Failed', e);
            }
        }, 500); // Wait for 500ms of inactivity
    }, [workspaceId, isLoading]);

    const handleExcalidrawChange = useCallback((elements: readonly any[], appState: any, files: any) => {
        if (isLoading) return; // Ignore changes during the loading phase
        
        // 1. Selection & Drawing detection
        const selectedIds = getSelectedIds(appState.selectedElementIds);
        
        if (onSelectionChange) {
            onSelectionChange(selectedIds.length > 0);
        }

        const hasContent = elements.some((el: any) => !el.isDeleted && el.type !== 'image');
        if (!hasDrawn && hasContent && onFirstDraw) {
            setHasDrawn(true);
            onFirstDraw();
        }

        // 2. Persist
        persist(elements, appState, files);
    }, [hasDrawn, onFirstDraw, onSelectionChange, persist, isLoading]);

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
          const sel = excalidrawAPI.getAppState().selectedElementIds;
          return getSelectedIds(sel).length > 0;
      },
      setImage: (image: GeneratedImage) => loadImage(image),
    }), [excalidrawAPI, loadImage]);

    // --- The Reset & Restore Logic ---
    useEffect(() => {
        if (!excalidrawAPI) return;

        const loadWorkspace = async () => {
            setIsLoading(true);
            const targetId = workspaceId || 'anonymous_temp';

            try {
                // 1. Clear the current board entirely
                excalidrawAPI.resetScene();
                
                // 2. Fetch new data
                const saved = await getWorkspaceData(targetId);
                
                if (saved) {
                    // 3. Load files first, then elements
                    if (saved.files) excalidrawAPI.addFiles(Object.values(saved.files));
                    
                    excalidrawAPI.updateScene({ 
                        elements: saved.elements || [],
                        appState: {
                            ...(saved.appState || {}),
                            isLoading: false // Ensure Excalidraw isn't stuck in loading mode
                        }
                    });
                }

                // 4. Mark this ID as the successfully loaded one
                activeLoadedId.current = targetId;
            } catch (err) {
                console.error('Failed to switch workspace:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkspace();
    }, [excalidrawAPI, workspaceId]); // Triggered every time the ID in the URL changes

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

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
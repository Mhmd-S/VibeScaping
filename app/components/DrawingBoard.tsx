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
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // CRITICAL: Track the ID that is currently "active" in the UI to prevent cross-saving
    const activeLoadedId = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Track if we've already triggered the 'first draw' for this session
    // This resets whenever workspaceId changes, allowing fresh starts
    const hasTriggeredFirstDraw = useRef(false);

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
        const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);

        // Calculate non-overlapping position
        let targetX = (appState.width / 2 - img.naturalWidth / 2) / appState.zoom.value - appState.scrollX;
        let targetY = (appState.height / 2 - img.naturalHeight / 2) / appState.zoom.value - appState.scrollY;

        const PADDING = 40;
        const existingImages = currentElements
          .filter((el: any) => el.type === 'image')
          .map((el: any) => ({
            x: el.x,
            y: el.y,
            right: el.x + el.width,
            bottom: el.y + el.height,
          }));

        const overlaps = (x: number, y: number, w: number, h: number) =>
          existingImages.some((b: any) =>
            x < b.right + PADDING &&
            x + w > b.x - PADDING &&
            y < b.bottom + PADDING &&
            y + h > b.y - PADDING
          );

        if (existingImages.length > 0 && overlaps(targetX, targetY, img.naturalWidth, img.naturalHeight)) {
          const maxRight = Math.max(...existingImages.map((b: any) => b.right));
          targetX = maxRight + PADDING;
          targetY = existingImages[0].y;
        }

        // FIXED: Complete property set to prevent resizing TypeErrors
        const imageElement: any = {
          type: "image",
          id: elementId,
          status: "saved",
          fileId: fileId,
          x: targetX,
          y: targetY,
          width: img.naturalWidth,
          height: img.naturalHeight,
          scale: [1, 1], // Scale factor [scaleX, scaleY]
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
          locked: false,
        };

        excalidrawAPI.updateScene({
          elements: [...currentElements, imageElement],
        });

        // Scroll to the new image and temporarily highlight it
        setTimeout(() => {
          excalidrawAPI.scrollToContent(imageElement, { fitToViewport: false, animate: true });
          excalidrawAPI.updateScene({
            appState: { selectedElementIds: { [elementId]: true } },
          });
          // Remove highlight after 2.5s
          setTimeout(() => {
            excalidrawAPI.updateScene({
              appState: { selectedElementIds: {} },
            });
          }, 2500);
        }, 100);

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
                const data = { 
                    elements: elements.filter((el: any) => !el.isDeleted), 
                    files,
                    // Only save essential UI state
                    appState: {
                        viewBackgroundColor: appState.viewBackgroundColor,
                        zoom: appState.zoom,
                        scrollX: appState.scrollX,
                        scrollY: appState.scrollY
                    }
                };

                // Always save to IndexedDB for local access
                await saveWorkspaceData(id, data);

                // Sync to cloud if user has subscription
                try {
                    const sessionResponse = await fetch('/api/auth/session');
                    if (sessionResponse.ok) {
                        const session = await sessionResponse.json();
                        const userId = session?.user?.id;
                        if (userId) {
                            const syncResponse = await fetch('/api/workspace/sync', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ workspaceId: id }),
                            });
                            // Don't throw on sync failure - local save is primary
                            if (!syncResponse.ok) {
                                console.log('Cloud sync failed, but local save succeeded');
                            }
                        }
                    }
                } catch (syncError) {
                    // Ignore sync errors - local save is the priority
                    console.log('Cloud sync error (non-critical):', syncError);
                }
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

        // Check if there is actual content (excluding deleted items and the initial image)
        const hasContent = elements.some((el: any) => !el.isDeleted && el.type !== 'image');
        
        // TRIGGER: If content exists and we haven't told the parent yet, do it now
        if (hasContent && !hasTriggeredFirstDraw.current && onFirstDraw) {
            hasTriggeredFirstDraw.current = true;
            onFirstDraw(); // This calls handleFirstDraw in DrawingBoardChat
        }

        // 2. Persist
        persist(elements, appState, files);
    }, [onFirstDraw, onSelectionChange, persist, isLoading]);

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
      clearCanvas: () => {
        excalidrawAPI?.resetScene();
        // This will trigger the onChange and save an empty array to IndexedDB
      },
    }), [excalidrawAPI, loadImage]);

    // Reset hasTriggeredFirstDraw whenever workspaceId changes (especially when going to null)
    useEffect(() => {
        hasTriggeredFirstDraw.current = false;
    }, [workspaceId]);

    // --- The Reset & Restore Logic ---
    useEffect(() => {
        if (!excalidrawAPI) return;

        const loadOrReset = async () => {
            setIsLoading(true);
            // If no workspaceId (we are at /chat), use the temporary key
            const targetId = workspaceId || 'anonymous_temp';

            try {
                // 1. Force a clean slate
                excalidrawAPI.resetScene();
                
                // 2. Clear history so they can't "undo" back into the deleted project
                try {
                    const history = excalidrawAPI.history as any;
                    if (history && typeof history.clearCurrentEntry === 'function') {
                        history.clearCurrentEntry();
                    }
                } catch (historyError) {
                    // History clearing is optional, continue if it fails
                    console.warn('Could not clear history:', historyError);
                }

                // 3. Try to load data for the targetId (could be empty if new/deleted)
                const saved = await getWorkspaceData(targetId);
                
                if (saved) {
                    if (saved.files) excalidrawAPI.addFiles(Object.values(saved.files));
                    excalidrawAPI.updateScene({ 
                        elements: saved.elements || [],
                        appState: { ...saved.appState, isLoading: false }
                    });
                }

                // 4. Update the "Lock" - This fixes the "incapable of saving" issue
                // Reset to anonymous_temp when workspaceId is undefined to allow fresh starts
                activeLoadedId.current = targetId;
                
            } catch (err) {
                console.error('Switch failed:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadOrReset();
    }, [excalidrawAPI, workspaceId]); // This fires every time you navigate to or away from a workspace

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return (
      <div className="w-full h-full md:h-[calc(100vh-15px)] md:shadow-lg md:border md:border-border md:rounded-lg md:p-1 customStylesExcalidraw">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleExcalidrawChange}
          UIOptions={{
            canvasActions: {
              loadScene: false,
            },
          }}
        />
      </div>
    );
  }
);

export default DrawingBoard;
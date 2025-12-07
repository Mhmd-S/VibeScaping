"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Group, Arrow } from "react-konva";
import Konva from "konva";
import {
    Annotation,
    AnnotationTool,
    GeneratedImage,
    Point,
    RevisionNode,
} from "../types/landscape";
import { useImage } from "../hooks/useImage";
import {
  DEFAULT_LABEL_WIDTH,
  DEFAULT_LABEL_HEIGHT,
  simplifyAnnotationPoints,
  getAnnotationAnchorPoint,
  getShapeConnectionPoint,
  getLabelConnectionPoint,
} from "../utils/annotationHelpers";
import { renderAnnotationShape, renderCurrentDrawing } from "../utils/annotationRenderers";
import { TextLabel } from "./annotation/TextLabel";
import { AnnotationToolbar } from "./annotation/AnnotationToolbar";
import { AnnotationHeader } from "./annotation/AnnotationHeader";
import { CheckpointsDrawer } from "./annotation/CheckpointsDrawer";
import { AnnotationList } from "./annotation/AnnotationList";

interface AnnotationEditorProps {
  generatedImage: GeneratedImage;
  originalCapturedImage?: GeneratedImage | null;
  onCancel: () => void;
  onRevisionComplete: (data: {
    image: string;
    mimeType: string;
    description?: string;
    annotations: string[];
  }) => void;
  onError: (message: string) => void;
}

export const AnnotationEditor = ({
    generatedImage,
    originalCapturedImage,
    onCancel,
    onRevisionComplete,
    onError,
}: AnnotationEditorProps) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentTool, setCurrentTool] = useState<AnnotationTool>("freehand");
    const annotationColor = "#ef4444";
    const [isAnnotationDrawing, setIsAnnotationDrawing] = useState(false);
    const [currentAnnotationPoints, setCurrentAnnotationPoints] = useState<Point[]>([]);
    const [isRevising, setIsRevising] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);
    const [generatedSize, setGeneratedSize] = useState<{
        width: number;
        height: number;
    } | null>(null);
    const [referenceSize, setReferenceSize] = useState<{
        width: number;
        height: number;
    } | null>(null);
    const [showOriginalReference, setShowOriginalReference] = useState(
        !!originalCapturedImage
    );
    const [activeImage, setActiveImage] = useState<GeneratedImage>(
        generatedImage
    );
    const [revisionHistory, setRevisionHistory] = useState<RevisionNode[]>([]);
    const lastRevisionImageRef = useRef<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
    const [editingTextArea, setEditingTextArea] = useState<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    const stageRef = useRef<Konva.Stage | null>(null);
    const layerRef = useRef<Konva.Layer | null>(null);
    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const referenceScrollRef = useRef<HTMLDivElement | null>(null);
    const isSyncingScrollRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const isClosingTextareaRef = useRef(false);

    // Load the main image
    const imageSrc = useMemo(() => 
        activeImage?.image ? `data:${activeImage.mimeType};base64,${activeImage.image}` : "",
        [activeImage]
    );
    const konvaImage = useImage(imageSrc);

  const handleLabelDragEnd = useCallback((id: string, x: number, y: number) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === id ? { ...ann, labelOffset: { x, y } } : ann
      )
    );
  }, []);

  const handleLabelTransformEnd = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === id
            ? {
                ...ann,
                labelSize: { width, height },
                labelOffset: { x, y },
              }
            : ann
        )
      );
    },
    []
  );

  const handleLabelDoubleClick = useCallback((id: string) => {
    // Clear any existing selection to prevent conflicts
    setSelectedLabelId(null);
    
    // Small delay to let the selection clear
    requestAnimationFrame(() => {
      const ann = annotations.find((a) => a.id === id);
      if (!ann || !stageRef.current) return;

      const anchor = getAnnotationAnchorPoint(ann);
      const labelSize = ann.labelSize || {
        width: DEFAULT_LABEL_WIDTH,
        height: DEFAULT_LABEL_HEIGHT,
      };

      // Calculate position relative to the stage
      const scale = imageZoom;

      // Position the textarea
      setEditingTextArea({
        id: ann.id,
        x: anchor.x * scale,
        y: anchor.y * scale,
        width: labelSize.width * scale,
        height: labelSize.height * scale,
      });

      // Focus after a brief delay to ensure textarea is rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
    });
  }, [annotations, imageZoom]);

  const handleTextareaBlur = useCallback(() => {
    isClosingTextareaRef.current = true;
    setEditingTextArea(null);
    // Reset the flag after a short delay
    setTimeout(() => {
      isClosingTextareaRef.current = false;
    }, 100);
  }, []);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Enter without Shift closes the textbox
        e.preventDefault();
        isClosingTextareaRef.current = true;
        setEditingTextArea(null);
        // Reset the flag after a short delay
        setTimeout(() => {
          isClosingTextareaRef.current = false;
        }, 100);
      } else if (e.key === "Escape") {
        isClosingTextareaRef.current = true;
        setEditingTextArea(null);
        // Reset the flag after a short delay
        setTimeout(() => {
          isClosingTextareaRef.current = false;
        }, 100);
      }
      // Shift+Enter for new lines (default textarea behavior)
    },
    []
  );

  const handleLabelClick = useCallback((id: string) => {
    setSelectedLabelId(id);
  }, []);

  // Set image dimensions when konva image loads
  useEffect(() => {
    if (konvaImage) {
      setGeneratedSize({
        width: konvaImage.width,
        height: konvaImage.height,
      });
    }
  }, [konvaImage]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Don't handle clicks if we just closed the textarea
      if (isClosingTextareaRef.current) {
        return;
      }

      const target = e.target;
      const stage = target.getStage();
      
      // Check what we clicked on
      const targetType = target.getType();
      const parentType = target.parent?.getType();
      
      // Check if we clicked on a text label or its components
      const isLabelGroup = targetType === 'Group' && parentType === 'Layer';
      const isLabelChild = (targetType === 'Rect' || targetType === 'Text') && parentType === 'Group';
      const clickedOnLabel = isLabelGroup || isLabelChild;
      
      // Check if clicked on transformer
      const clickedOnTransformer = targetType === 'Transformer';
      
      // Deselect labels when clicking on the image or stage
      if (targetType === 'Image' || target === stage) {
        setSelectedLabelId(null);
      }

      // Don't handle drawing if select tool is active
      if (currentTool === "select") return;
      
      // Don't handle drawing if we clicked on a label or transformer
      if (clickedOnLabel || clickedOnTransformer) {
        return;
      }

      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      // If not currently drawing, start drawing
      if (!isAnnotationDrawing) {
        setIsAnnotationDrawing(true);
        setCurrentAnnotationPoints([{ x: pos.x, y: pos.y }]);
      } else {
        // If already drawing, finish the annotation
        let finalPoints = currentAnnotationPoints;
        if (currentTool === "freehand") {
          finalPoints = simplifyAnnotationPoints(currentAnnotationPoints, 3);
        }

        if (finalPoints.length >= 2) {
          const newAnnotation: Annotation = {
            id: `ann-${Date.now()}`,
            type: currentTool,
            points: finalPoints,
            text: "",
            color: annotationColor,
            isEditing: false,
            labelOffset: { x: 0, y: 0 },
            labelSize: {
              width: DEFAULT_LABEL_WIDTH,
              height: DEFAULT_LABEL_HEIGHT,
            },
          };
          setAnnotations((prev) => [...prev, newAnnotation]);
          
          // Automatically open the text editor for the new annotation
          setTimeout(() => {
            handleLabelDoubleClick(newAnnotation.id);
          }, 100);
        }

        setIsAnnotationDrawing(false);
        setCurrentAnnotationPoints([]);
      }
    },
    [currentTool, isAnnotationDrawing, currentAnnotationPoints, annotationColor, handleLabelDoubleClick]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isAnnotationDrawing || currentTool === "select") return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Add points continuously as mouse moves (without holding button down)
      setCurrentAnnotationPoints((prev) => {
        if (prev.length === 0) return [{ x: pos.x, y: pos.y }];
        
        // Calculate distance from last point to avoid adding too many points
        const lastPoint = prev[prev.length - 1];
        const distance = Math.sqrt(
          Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2)
        );
        
        // Only add point if it's far enough from the last one (reduces noise)
        if (distance > 2) {
          return [...prev, { x: pos.x, y: pos.y }];
        }
        
        return prev;
      });
    },
    [isAnnotationDrawing, currentTool]
  );

  const updateAnnotationText = useCallback((id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id === id) {
          // Calculate new height based on text content
          const tempText = new Konva.Text({
            text: text,
            fontSize: 14,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            width: (ann.labelSize?.width || DEFAULT_LABEL_WIDTH) - 24,
            wrap: 'word',
          });
          
          const textHeight = tempText.height();
          const newHeight = Math.max(36, textHeight + 24);
          
          return {
            ...ann,
            text,
            labelSize: {
              width: ann.labelSize?.width || DEFAULT_LABEL_WIDTH,
              height: newHeight,
            },
          };
        }
        return ann;
      })
    );
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
    setSelectedLabelId(null);
    setEditingTextArea(null);
  }, []);

  useEffect(() => {
    if (!originalCapturedImage) {
      setShowOriginalReference(false);
    }
  }, [originalCapturedImage]);

  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const preventKeyZoom = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key;
      if (key === "+" || key === "-" || key === "=" || key === "0") {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel drawing with Escape key
      if (e.key === "Escape" && isAnnotationDrawing && !editingTextArea) {
        e.preventDefault();
        setIsAnnotationDrawing(false);
        setCurrentAnnotationPoints([]);
        return;
      }
      
      // Delete selected annotation with Delete or Backspace key
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLabelId && !editingTextArea) {
        e.preventDefault();
        deleteAnnotation(selectedLabelId);
      }
    };

    window.addEventListener("wheel", preventBrowserZoom, { passive: false });
    window.addEventListener("keydown", preventKeyZoom);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", preventBrowserZoom);
      window.removeEventListener("keydown", preventKeyZoom);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedLabelId, editingTextArea, deleteAnnotation, isAnnotationDrawing]);

    useEffect(() => {
        setActiveImage(generatedImage);
    }, [generatedImage]);

  useEffect(() => {
    // Start each new generated image with a clean slate of annotations
    setAnnotations([]);
    setCurrentAnnotationPoints([]);
  }, [generatedImage]);

    useEffect(() => {
        if (!activeImage?.image) return;
        if (lastRevisionImageRef.current === activeImage.image) return;
        setRevisionHistory((prev) => {
            const parentId = prev.length ? prev[prev.length - 1].id : null;
            const label =
                prev.length === 0 ? "Initial image" : `Revision ${prev.length}`;
            const next: RevisionNode = {
                id: `rev-${Date.now()}`,
                parentId,
                image: activeImage.image,
                mimeType: activeImage.mimeType,
                annotations: [],
                timestamp: Date.now(),
                label,
            };
            return [...prev, next];
        });
        lastRevisionImageRef.current = activeImage.image;
    }, [activeImage]);

  const referenceScaleBoost = 1.2;

  const referenceScale = useMemo(() => {
    if (!showOriginalReference || !generatedSize || !referenceSize) return 1;
    if (referenceSize.width === 0) return 1;
    return (generatedSize.width / referenceSize.width) * referenceScaleBoost;
  }, [generatedSize, referenceSize, showOriginalReference]);

    const sendForRevision = useCallback(async () => {
        if (!activeImage || annotations.length === 0 || !stageRef.current) return;

        setIsRevising(true);

        try {
            const stage = stageRef.current;
            
            // Export the stage as data URL
            const dataUrl = stage.toDataURL({ pixelRatio: 1 });
            const base64 = dataUrl.split(",")[1];

            const annotationTexts = annotations
                .filter((ann) => ann.text)
                .map((ann) => ann.text);

            const response = await fetch("/api/generate-landscape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: "image/png",
                    isRevision: true,
                    revisionNotes: annotationTexts,
                    revisionMode: "annotation",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.details || data.error || "Failed to revise landscape"
                );
            }

            setRevisionHistory((prev) => {
                const parentId = prev.length ? prev[prev.length - 1].id : null;
                const next: RevisionNode = {
                    id: `rev-${Date.now()}`,
                    parentId,
                    image: data.image,
                    mimeType: data.mimeType,
                    annotations: annotationTexts,
                    timestamp: Date.now(),
                    label: `Revision ${prev.length}`,
                };
                return [...prev, next];
            });
            lastRevisionImageRef.current = data.image;
            setActiveImage({
                image: data.image,
                mimeType: data.mimeType,
                description: data.description,
            });

            onRevisionComplete({
                image: data.image,
                mimeType: data.mimeType,
                description: data.description,
                annotations: annotationTexts,
            });
            setAnnotations([]);
        } catch (err) {
            onError(
                err instanceof Error
                    ? err.message
                    : "Failed to revise landscape. Please try again."
            );
        } finally {
            setIsRevising(false);
        }
    }, [
        activeImage,
        annotations,
        onRevisionComplete,
        onError,
    ]);

  const applyZoomFactor = useCallback((factor: number) => {
    setImageZoom((prev) => Math.min(Math.max(prev * factor, 0.25), 4));
  }, []);

    const zoomIn = useCallback(() => {
        applyZoomFactor(1.1);
    }, [applyZoomFactor]);

  const zoomOut = useCallback(() => {
    applyZoomFactor(1 / 1.1);
  }, [applyZoomFactor]);

  const resetZoom = useCallback(() => {
    setImageZoom(1);
  }, []);

  const rotateLeft = useCallback(() => {
    setImageRotation((prev) => (prev - 90) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setImageRotation((prev) => (prev + 90) % 360);
  }, []);

  const resetRotation = useCallback(() => {
    setImageRotation(0);
  }, []);

  const handleWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        applyZoomFactor(factor);
      }
    },
    [applyZoomFactor]
  );

  const handleReferenceWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        applyZoomFactor(factor);
      }
    },
    [applyZoomFactor]
  );

    const handleReferenceLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            setReferenceSize({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
        },
        []
    );

  const syncScroll = useCallback((source: "main" | "ref") => {
    if (isSyncingScrollRef.current) return;
    const main = mainScrollRef.current;
    const ref = referenceScrollRef.current;
    if (!main || !ref) return;

    const applySync = (from: HTMLDivElement, to: HTMLDivElement) => {
      const maxX = Math.max(to.scrollWidth - to.clientWidth, 0);
      const maxY = Math.max(to.scrollHeight - to.clientHeight, 0);
      const ratioX =
        from.scrollWidth > from.clientWidth
          ? from.scrollLeft / Math.max(from.scrollWidth - from.clientWidth, 1)
          : 0;
      const ratioY =
        from.scrollHeight > from.clientHeight
          ? from.scrollTop / Math.max(from.scrollHeight - from.clientHeight, 1)
          : 0;
      to.scrollLeft = ratioX * maxX;
      to.scrollTop = ratioY * maxY;
    };

    isSyncingScrollRef.current = true;
    if (source === "main") {
      applySync(main, ref);
    } else {
      applySync(ref, main);
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

    const restoreCheckpoint = useCallback(
        (revisionId: string) => {
            const revision = revisionHistory.find((rev) => rev.id === revisionId);
            if (!revision) return;
            lastRevisionImageRef.current = revision.image;
            setActiveImage({
                image: revision.image,
                mimeType: revision.mimeType,
                description: revision.label,
            });
            setAnnotations([]);
            setImageZoom(1);
            setImageRotation(0);
        },
        [revisionHistory]
    );

    const handleRestoreCheckpoint = useCallback(
        (revisionId: string) => {
            restoreCheckpoint(revisionId);
            setIsDrawerOpen(false);
        },
        [restoreCheckpoint]
    );

  return (
    <>
    <div className="fixed inset-x-0 bottom-0 top-0 z-50 flex bg-zinc-900">
      <AnnotationToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onRotateLeft={rotateLeft}
        onRotateRight={rotateRight}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AnnotationHeader
          showOriginalReference={showOriginalReference}
          onToggleReference={() => setShowOriginalReference((prev) => !prev)}
          hasOriginalImage={!!originalCapturedImage}
          annotationCount={annotations.length}
          isRevising={isRevising}
          onSendForRevision={sendForRevision}
          onOpenCheckpoints={() => setIsDrawerOpen(true)}
        />

        <div className="flex-1 overflow-auto bg-zinc-950 p-4">
          <div
            className={`grid gap-4 ${
              showOriginalReference ? "lg:grid-cols-2" : ""
            }`}
          >
            <div
              className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3"
              onWheel={handleWheelZoom}
              onScroll={() => syncScroll("main")}
              ref={mainScrollRef}
            >
              {currentTool === "freehand" && !isAnnotationDrawing && (
                <div className="mb-3 rounded-lg bg-blue-900/50 border border-blue-700 px-4 py-3 text-sm text-blue-200">
                  <p className="font-medium">Click to start drawing, then move your mouse to draw</p>
                  <p className="text-xs text-blue-300 mt-1">Click again to finish</p>
                </div>
              )}
              {currentTool === "freehand" && isAnnotationDrawing && (
                <div className="mb-3 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-sm text-green-200">
                  <p className="font-medium">Drawing... Move mouse to continue</p>
                  <p className="text-xs text-green-300 mt-1">Click to finish • Press ESC to cancel</p>
                </div>
              )}
              <div
                className="relative inline-block"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  transformOrigin: "top left",
                }}
              >
                {konvaImage && generatedSize && (
                  <>
                    <Stage
                      ref={stageRef}
                      width={generatedSize.width}
                      height={generatedSize.height}
                      onClick={(e) => {
                        // Close textarea if it's open
                        if (editingTextArea) {
                          handleTextareaBlur();
                          return;
                        }
                        handleStageClick(e);
                      }}
                      onMouseMove={handleStageMouseMove}
                      className={`rounded-lg shadow-2xl ${
                        currentTool !== "select"
                          ? "cursor-crosshair"
                          : "cursor-default"
                      }`}
                    >
                      <Layer ref={layerRef}>
                        <KonvaImage image={konvaImage} />
                        {annotations.map((ann) => renderAnnotationShape(ann))}
                        {renderCurrentDrawing(currentAnnotationPoints, currentTool, annotationColor)}
                        
                        {/* Render connector lines from labels to shapes */}
                        {annotations.map((ann) => {
                          const anchor = getAnnotationAnchorPoint(ann);
                          const labelSize = ann.labelSize || {
                            width: DEFAULT_LABEL_WIDTH,
                            height: DEFAULT_LABEL_HEIGHT,
                          };
                          
                          const shapePoint = getShapeConnectionPoint(ann, anchor.x, anchor.y);
                          const labelPoint = getLabelConnectionPoint(
                            anchor.x,
                            anchor.y,
                            labelSize.width,
                            labelSize.height,
                            shapePoint.x,
                            shapePoint.y
                          );

                          return (
                            <Group key={`connector-${ann.id}`}>
                              {/* Connector line with arrow */}
                              <Arrow
                                points={[
                                  shapePoint.x,
                                  shapePoint.y,
                                  labelPoint.x,
                                  labelPoint.y,
                                ]}
                                stroke={ann.color}
                                fill={ann.color}
                                strokeWidth={3}
                                pointerLength={12}
                                pointerWidth={12}
                                lineCap="round"
                                opacity={0.85}
                              />
                            </Group>
                          );
                        })}

                        {/* Render text labels */}
                        {annotations.map((ann) => {
                          const anchor = getAnnotationAnchorPoint(ann);
                          return (
                            <TextLabel
                              key={`label-${ann.id}`}
                              annotation={{ ...ann, labelOffset: anchor }}
                              onDragEnd={handleLabelDragEnd}
                              onTransformEnd={handleLabelTransformEnd}
                              onDoubleClick={handleLabelDoubleClick}
                              onClick={handleLabelClick}
                              isSelected={selectedLabelId === ann.id}
                            />
                          );
                        })}
                      </Layer>
                    </Stage>

                    {/* HTML Textarea overlay for editing */}
                    {editingTextArea && (
                      <div
                        className="absolute z-20"
                        style={{
                          left: editingTextArea.x,
                          top: editingTextArea.y,
                          width: editingTextArea.width,
                          height: editingTextArea.height,
                          transform: `rotate(${imageRotation}deg)`,
                          transformOrigin: "top left",
                          pointerEvents: 'auto',
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <textarea
                          ref={textareaRef}
                          value={
                            annotations.find((a) => a.id === editingTextArea.id)
                              ?.text || ""
                          }
                          onChange={(e) =>
                            updateAnnotationText(editingTextArea.id, e.target.value)
                          }
                          onBlur={handleTextareaBlur}
                          onKeyDown={handleTextareaKeyDown}
                          className="w-full h-full rounded-md border-2 border-blue-500 bg-white px-3 py-2 text-sm text-gray-900 outline-none resize-none shadow-lg"
                          placeholder="Type annotation (Enter to save, Shift+Enter for new line)"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {showOriginalReference && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900">
                <div
                  className="mt-3 rounded border border-dashed border-zinc-700 bg-zinc-950 p-2 min-h-[200px] overflow-auto"
                  onWheel={handleReferenceWheelZoom}
                  onScroll={() => syncScroll("ref")}
                  ref={referenceScrollRef}
                >
                  {originalCapturedImage ? (
                    <div
                      className="relative inline-block"
                      style={{
                        transform: `scale(${imageZoom * referenceScale})`,
                        transformOrigin: "top left",
                        width: referenceSize?.width
                          ? `${referenceSize.width}px`
                          : "auto",
                        height: referenceSize?.height
                          ? `${referenceSize.height}px`
                          : "auto",
                      }}
                    >
                      <img
                        src={`data:${originalCapturedImage.mimeType};base64,${originalCapturedImage.image}`}
                        onLoad={handleReferenceLoad}
                        alt="Original reference capture"
                        className="block rounded-lg shadow"
                        style={{
                          width: referenceSize?.width
                            ? `${referenceSize.width}px`
                            : "auto",
                          height: referenceSize?.height
                            ? `${referenceSize.height}px`
                            : "auto",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center">
                      Original map capture not found.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <AnnotationList
          annotations={annotations}
          selectedLabelId={selectedLabelId}
          onSelectAnnotation={setSelectedLabelId}
          onDeleteAnnotation={deleteAnnotation}
        />
      </div>
    </div>

    <CheckpointsDrawer
      isOpen={isDrawerOpen}
      onClose={() => setIsDrawerOpen(false)}
      revisionHistory={revisionHistory}
      onRestoreCheckpoint={handleRestoreCheckpoint}
    />
    </>
  );
};

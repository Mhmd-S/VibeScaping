"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Circle } from "react-konva";
import Konva from "konva";
import { Eye, EyeOff, X } from "lucide-react";
import {
  Annotation,
  AnnotationTool,
  GeneratedImage,
  Point,
  RevisionNode,
} from "../types/landscape";
import { useImage } from "../hooks/useImage";
import {
  MIN_LABEL_HEIGHT,
  DEFAULT_LABEL_WIDTH,
  DEFAULT_LABEL_HEIGHT,
  simplifyAnnotationPoints,
  getAnnotationAnchorPoint,
} from "../utils/annotationHelpers";
import {
  renderAnnotationShape,
  renderCurrentDrawing,
} from "../utils/annotationRenderers";
import { TextLabel } from "./annotation/TextLabel";
import { AnnotationToolbar } from "./annotation/AnnotationToolbar";
import { AnnotationHeader } from "./annotation/AnnotationHeader";
import { CheckpointsDrawer } from "./annotation/CheckpointsDrawer";
import { AnnotationList } from "./annotation/AnnotationList";

const MIN_CANVAS_WIDTH = 2000;
const MIN_CANVAS_HEIGHT = 1400;
const CANVAS_PADDING = 300;

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

const resolveImageSource = (image?: GeneratedImage | null) => {
  if (!image?.image) return "";

  const raw = image.image;

  if (raw.startsWith("data:")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const publicUrl = toPublicImageUrl(raw) || raw;
      // Use proxy route for R2 URLs to avoid CORS issues
      // Check if the public URL is from R2 (r2.dev or cloudflarestorage.com)
      try {
        const publicParsed = new URL(publicUrl);
        if (
          publicParsed.hostname.includes("r2.dev") ||
          publicParsed.hostname.includes("cloudflarestorage.com")
        ) {
          return `/api/proxy-image?url=${encodeURIComponent(publicUrl)}`;
        }
      } catch {
        // If publicUrl is not a valid URL, check the original
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
  const [annotations, setAnnotations] = useState<Map<string, Annotation>>(
    new Map()
  );
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("select");
  const annotationColor = "#ef4444";
  const [isAnnotationDrawing, setIsAnnotationDrawing] = useState(false);
  const [currentAnnotationPoints, setCurrentAnnotationPoints] = useState<
    Point[]
  >([]);
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
  const [showOriginalReference, setShowOriginalReference] = useState(false);
  const [activeImage, setActiveImage] =
    useState<GeneratedImage>(generatedImage);
  const [revisionHistory, setRevisionHistory] = useState<RevisionNode[]>([]);
  const lastRevisionImageRef = useRef<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>(
    []
  );
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(
    null
  );
  const [showFreehandInstructions, setShowFreehandInstructions] =
    useState(true);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const justCompletedDragSelectRef = useRef(false);
  
  // Convert Map to array for filtering
  const annotationsArray = useMemo(() => Array.from(annotations.values()), [annotations]);
  
  const selectedAnnotations = useMemo(
    () => annotationsArray.filter((ann) => selectedAnnotationIds.includes(ann.id)),
    [annotationsArray, selectedAnnotationIds]
  );

  const updateAnnotationPoint = useCallback(
    (id: string, pointIndex: number, x: number, y: number) => {
      setAnnotations((prev) => {
        const ann = prev.get(id);
        if (!ann) return prev;
        const nextPoints = ann.points.map((p, idx) =>
          idx === pointIndex ? { x, y } : p
        );
        const next = new Map(prev);
        next.set(id, { ...ann, points: nextPoints });
        return next;
      });
    },
    []
  );

  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const referenceScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const selectionStartRef = useRef<Point | null>(null);

  // Load the main image
  const imageSrc = useMemo(
    () => resolveImageSource(activeImage),
    [activeImage]
  );
  const referenceImageSrc = useMemo(
    () => resolveImageSource(originalCapturedImage),
    [originalCapturedImage]
  );
  // Proxied images are same-origin, so no crossOrigin needed
  // For direct external URLs, we don't set crossOrigin to avoid CORS errors
  const [konvaImage] = useImage(imageSrc, null);

  const handleLabelDragEnd = useCallback((id: string, x: number, y: number) => {
    setAnnotations((prev) => {
      const ann = prev.get(id);
      if (!ann) return prev;
      const next = new Map(prev);
      next.set(id, { ...ann, labelOffset: { x, y } });
      return next;
    });
  }, []);

  const handleLabelTransformEnd = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      setAnnotations((prev) => {
        const ann = prev.get(id);
        if (!ann) return prev;
        const next = new Map(prev);
        next.set(id, {
          ...ann,
          labelSize: { width, height },
          labelOffset: { x, y },
        });
        return next;
      });
    },
    []
  );

  const handleLabelClick = useCallback(
    (id: string, e: Konva.KonvaEventObject<Event>) => {
      const multiKey =
        !!e.evt &&
        ((e.evt as MouseEvent).metaKey ||
          (e.evt as MouseEvent).ctrlKey ||
          (e.evt as MouseEvent).shiftKey);
      setSelectedAnnotationIds((prev) => {

        if (multiKey) {
          if (prev.includes(id)) {
            return prev.filter((item) => item !== id);
          }
          return [...prev, id];
        }

        if (prev.includes(id)) {
          setEditingAnnotationId(id);
        }

        return [id];
      });
    },
    []
  );

  const normalizeSelectionRect = useCallback((start: Point, end: Point) => {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }, []);

  const getAnnotationBounds = useCallback((ann: Annotation) => {
    if (ann.type === "textbox" && ann.labelOffset) {
      const width = ann.labelSize?.width || DEFAULT_LABEL_WIDTH;
      const height = ann.labelSize?.height || DEFAULT_LABEL_HEIGHT;
      return {
        x1: ann.labelOffset.x,
        y1: ann.labelOffset.y,
        x2: ann.labelOffset.x + width,
        y2: ann.labelOffset.y + height,
      };
    }

    const xs = ann.points.map((p) => p.x);
    const ys = ann.points.map((p) => p.y);

    return {
      x1: Math.min(...xs),
      y1: Math.min(...ys),
      x2: Math.max(...xs),
      y2: Math.max(...ys),
    };
  }, []);

  const selectAnnotationsInRect = useCallback(
    (rect: { x: number; y: number; width: number; height: number } | null) => {
      if (!rect || (rect.width < 3 && rect.height < 3)) {
        return;
      }

      const rectBounds = {
        x1: rect.x,
        y1: rect.y,
        x2: rect.x + rect.width,
        y2: rect.y + rect.height,
      };

      const intersects = (bounds: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      }) =>
        !(
          rectBounds.x2 < bounds.x1 ||
          rectBounds.x1 > bounds.x2 ||
          rectBounds.y2 < bounds.y1 ||
          rectBounds.y1 > bounds.y2
        );

      const hits = annotationsArray
        .slice()
        .reverse()
        .filter((ann) => intersects(getAnnotationBounds(ann)))
        .map((ann) => ann.id);

      setSelectedAnnotationIds(hits);
    },
    [annotationsArray, getAnnotationBounds]
  );

  // Set image dimensions when konva image loads
  useEffect(() => {
    if (konvaImage) {
      setGeneratedSize({
        width: konvaImage.width,
        height: konvaImage.height,
      });
    }
  }, [konvaImage]);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const target = e.target;
      const stage = target.getStage();
      const targetType = target.getType();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (targetType === "Image" || target === stage) {
        console.log("Reset Click");
        setSelectedAnnotationIds([]);
      }

      if (currentTool === "select") {
        selectionStartRef.current = pos;
        setSelectionRect({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
        });
        return;
      }

      setIsAnnotationDrawing(true);
      setCurrentAnnotationPoints([{ x: pos.x, y: pos.y }]);
    },
    [annotationColor, currentTool]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (currentTool === "select") {
        if (!selectionStartRef.current) return;
        setSelectionRect(
          normalizeSelectionRect(selectionStartRef.current, pos)
        );
        return;
      }

      if (!isAnnotationDrawing || currentTool === "textbox") {
        return;
      }

      setCurrentAnnotationPoints((prev) => {
        if (prev.length === 0) return [{ x: pos.x, y: pos.y }];

        if (currentTool === "freehand") {
          const lastPoint = prev[prev.length - 1];
          const distance = Math.sqrt(
            Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2)
          );
          if (distance > 2) {
            return [...prev, { x: pos.x, y: pos.y }];
          }
          return prev;
        }

        return [prev[0], { x: pos.x, y: pos.y }];
      });
    },
    [currentTool, isAnnotationDrawing, normalizeSelectionRect]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();

      if (currentTool === "select") {
        if (selectionStartRef.current && pos) {
          const normalized = normalizeSelectionRect(
            selectionStartRef.current,
            pos
          );
          // Check if this was actually a drag (not just a click)
          const wasDrag = normalized.width > 3 || normalized.height > 3;
          if (wasDrag) {
            justCompletedDragSelectRef.current = true;
            setSelectionRect(normalized);
            selectAnnotationsInRect(normalized);
          } else {
            // It was just a click, not a drag
            justCompletedDragSelectRef.current = false;
          }
        }
        selectionStartRef.current = null;
        setSelectionRect(null);
        return;
      }

      if (!isAnnotationDrawing || currentTool === "textbox") {
        return;
      }

      let finalPoints = currentAnnotationPoints;

      if (pos) {
        if (currentTool === "freehand") {
          finalPoints = [...currentAnnotationPoints, { x: pos.x, y: pos.y }];
        } else {
          finalPoints = [currentAnnotationPoints[0], { x: pos.x, y: pos.y }];
        }
      }

      if (currentTool === "freehand") {
        finalPoints = simplifyAnnotationPoints(finalPoints, 3);
      }

      const hasLength =
        finalPoints.length >= 2 &&
        (currentTool === "freehand"
          ? true
          : Math.hypot(
              finalPoints[finalPoints.length - 1].x - finalPoints[0].x,
              finalPoints[finalPoints.length - 1].y - finalPoints[0].y
            ) > 1);

      if (hasLength) {
        const newId = `ann-${Date.now()}`;
        const newAnnotation: Annotation = {
          id: newId,
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
        setAnnotations((prev) => {
          const next = new Map(prev);
          next.set(newId, newAnnotation);
          return next;
        });
      }

      setIsAnnotationDrawing(false);
      setCurrentAnnotationPoints([]);
    },
    [
      annotationColor,
      currentAnnotationPoints,
      currentTool,
      isAnnotationDrawing,
      normalizeSelectionRect,
      selectAnnotationsInRect,
    ]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isAnnotationDrawing) return;
      

      if (editingAnnotationId) {
        setEditingAnnotationId(null);
        return;
      }

      // Skip if we just completed a drag selection
      if (justCompletedDragSelectRef.current) {
        justCompletedDragSelectRef.current = false;
        return;
      }

      const target = e.target;
      const stage = target.getStage();

      if (target.className === "Image" || target === stage) {
        setSelectedAnnotationIds([]);
      }
    },
    [isAnnotationDrawing, editingAnnotationId]
  );

  const updateAnnotationText = useCallback((id: string, text: string) => {
    setAnnotations((prev: Map<string, Annotation>) => {
      const ann = prev.get(id);
      if (!ann || ann.type !== "textbox") return prev;
      // Calculate new height based on text content
      const tempText = new Konva.Text({
        text: text,
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, sans-serif",
        width: (ann.labelSize?.width || DEFAULT_LABEL_WIDTH) - 24,
        wrap: "word",
      });

      const textHeight = tempText.height();
      const newHeight = Math.max(36, textHeight + 24);

      const next = new Map<string, Annotation>(prev);
      next.set(id, {
        ...ann,
        text,
        labelSize: {
          width: ann.labelSize?.width || DEFAULT_LABEL_WIDTH,
          height: newHeight,
        },
      });

      console.log("Next", next);
      return next;
    });
  }, [annotations]);

  const deleteAnnotation = useCallback((idOrIds: string | string[]) => {
    const idsToDelete = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const deleteSet = new Set(idsToDelete);
    setAnnotations((prev) => {
      const next = new Map(prev);
      idsToDelete.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedAnnotationIds((prev) => prev.filter((id) => !deleteSet.has(id)));
    setEditingAnnotationId(null);
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
      if (e.key === "Escape" && isAnnotationDrawing && !editingAnnotationId) {
        e.preventDefault();
        setIsAnnotationDrawing(false);
        setCurrentAnnotationPoints([]);
        return;
      }

      // Delete selected annotation with Delete or Backspace key
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedAnnotationIds.length > 0 &&
        !editingAnnotationId
      ) {
        e.preventDefault();
        deleteAnnotation(selectedAnnotationIds);
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
  }, [
    selectedAnnotationIds,
    editingAnnotationId,
    deleteAnnotation,
    isAnnotationDrawing,
  ]);

  useEffect(() => {
    setActiveImage(generatedImage);
  }, [generatedImage]);

  useEffect(() => {
    // Start each new generated image with a clean slate of annotations
    setAnnotations(new Map());
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

  const referenceScale = useMemo(() => {
    if (!showOriginalReference || !generatedSize || !referenceSize) return 1;
    if (referenceSize.height === 0) return 1;
    // Scale to match the generated image height while preserving aspect ratio
    return generatedSize.height / referenceSize.height;
  }, [generatedSize, referenceSize, showOriginalReference]);

  const stageLayout = useMemo(() => {
    if (!generatedSize) return null;
    const width = Math.max(
      generatedSize.width + CANVAS_PADDING * 2,
      MIN_CANVAS_WIDTH
    );
    const height = Math.max(
      generatedSize.height + CANVAS_PADDING * 2,
      MIN_CANVAS_HEIGHT
    );
    return { width, height, offset: CANVAS_PADDING };
  }, [generatedSize]);

  const spawnTextbox = () => {
    if (!generatedSize) return;

    const width = stageLayout?.width ?? generatedSize.width;
    const height = stageLayout?.height ?? generatedSize.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const newId = `ann-${Date.now()}`;
    const newAnnotation: Annotation = {
      id: newId,
      type: "textbox",
      points: [{ x: centerX, y: centerY }],
      text: "Enter your text here",
      color: annotationColor,
      isEditing: false,
      labelOffset: { x: centerX, y: centerY },
      labelSize: {
        width: DEFAULT_LABEL_WIDTH,
        height: MIN_LABEL_HEIGHT,
      },
    };

    setAnnotations((prev) => {
      const next = new Map(prev);
      next.set(newId, newAnnotation);
      return next;
    });
    setSelectedAnnotationIds([newId]);
    setEditingAnnotationId(newId);
    setCurrentTool("select");
  };

  const sendForRevision = useCallback(async () => {
    if (!activeImage || annotations.size === 0 || !stageRef.current) return;

    setIsRevising(true);

    try {
      const stage = stageRef.current;

      // Export the stage as data URL
      const dataUrl = stage.toDataURL({ pixelRatio: 1 });
      const base64 = dataUrl.split(",")[1];

      const annotationTexts = annotationsArray
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
      setAnnotations(new Map());
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Failed to revise landscape. Please try again."
      );
    } finally {
      setIsRevising(false);
    }
  }, [activeImage, annotations, annotationsArray, onRevisionComplete, onError]);

  const sendForNewInitialImage = useCallback(async () => {
    if (!originalCapturedImage) return;

    setIsRevising(true);

    try {
      const response = await fetch("/api/generate-landscape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: originalCapturedImage?.image,
          mimeType: originalCapturedImage?.mimeType,
          isRevision: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details || data.error || "Failed to generate new initial image"
        );
      }

      const newRevisionId = `rev-${Date.now()}`;
      const nextRevision: RevisionNode = {
        id: newRevisionId,
        parentId: null,
        image: data.image,
        mimeType: data.mimeType,
        annotations: [],
        timestamp: Date.now(),
        label: "Original",
      };

      setRevisionHistory([nextRevision]);
      lastRevisionImageRef.current = data.image;

      setActiveImage({
        image: data.image,
        mimeType: data.mimeType,
        description: data.description,
      });
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Failed to generate new initial image. Please try again."
      );
    } finally {
      setIsRevising(false);
    }
  }, [originalCapturedImage, onError]);

  const handleDownloadImage = useCallback(() => {
    if (!stageRef.current || !activeImage) {
      onError("Image is not ready to download yet.");
      return;
    }

    try {
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 });
      const extension = activeImage.mimeType === "image/jpeg" ? "jpg" : "png";
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `landscape-${Date.now()}.${extension}`;
      link.click();
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Failed to download image. Please try again."
      );
    }
  }, [activeImage, onError]);

  const applyZoomFactor = useCallback(
    (factor: number, cursorX?: number, cursorY?: number) => {
      const scrollContainer = mainScrollRef.current;
      if (!scrollContainer || cursorX === undefined || cursorY === undefined) {
        // Fallback: just update zoom without cursor tracking
        setImageZoom((prev) => Math.min(Math.max(prev * factor, 0.25), 4));
        return;
      }

      // Get current zoom and scroll
      const currentZoom = imageZoom;
      const newZoom = Math.min(Math.max(currentZoom * factor, 0.25), 4);

      // Get the scroll container's bounding rect
      const rect = scrollContainer.getBoundingClientRect();

      // Calculate cursor position relative to scroll container
      const containerX = cursorX - rect.left;
      const containerY = cursorY - rect.top;

      // Calculate the point in the image space before zoom
      // Account for padding (p-3 = 12px)
      const padding = 12;
      const imageX =
        (containerX + scrollContainer.scrollLeft - padding) / currentZoom;
      const imageY =
        (containerY + scrollContainer.scrollTop - padding) / currentZoom;

      // Update zoom
      setImageZoom(newZoom);

      // Calculate new scroll position to keep cursor point in same visual position
      // Use requestAnimationFrame to ensure zoom state has updated
      requestAnimationFrame(() => {
        if (!scrollContainer) return;
        const newScrollLeft = imageX * newZoom + padding - containerX;
        const newScrollTop = imageY * newZoom + padding - containerY;

        scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
        scrollContainer.scrollTop = Math.max(0, newScrollTop);
      });
    },
    [imageZoom]
  );

  const zoomIn = useCallback(() => {
    const scrollContainer = mainScrollRef.current;
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      // Zoom to center of viewport
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      applyZoomFactor(1.1, centerX, centerY);
    } else {
      applyZoomFactor(1.1);
    }
  }, [applyZoomFactor]);

  const zoomOut = useCallback(() => {
    const scrollContainer = mainScrollRef.current;
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      // Zoom to center of viewport
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      applyZoomFactor(1 / 1.1, centerX, centerY);
    } else {
      applyZoomFactor(1 / 1.1);
    }
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
        applyZoomFactor(factor, e.clientX, e.clientY);
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
        applyZoomFactor(factor, e.clientX, e.clientY);
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
      setAnnotations(new Map());
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
      {/* Fixed button for toggling original reference */}
      {originalCapturedImage && (
        <button
          onClick={() => setShowOriginalReference((prev) => !prev)}
          className="fixed top-20 right-4 z-60 rounded-lg bg-zinc-800 p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white border border-zinc-700 shadow-lg *:text-sm  cursor-pointer"
          title={showOriginalReference ? "Hide Original" : "Show Original"}
        >
          {showOriginalReference ? (
            <span className="flex items-center gap-2">
              <EyeOff className="h-5 w-5" />
              Hide Original
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Show Original
            </span>
          )}
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 top-0 z-50 flex bg-zinc-900">
        <AnnotationToolbar
          onBack={onCancel}
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRotateLeft={rotateLeft}
          onRotateRight={rotateRight}
          onOpenCheckpoints={() => setIsDrawerOpen(true)}
          spawnTextbox={spawnTextbox}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AnnotationHeader
            annotationCount={annotations.size}
            isRevising={isRevising}
            onSendForRevision={sendForRevision}
            isInitialImage={
              revisionHistory[revisionHistory.length - 1]?.parentId === null
            }
            onSendForNewInitialImage={sendForNewInitialImage}
            onDownloadImage={handleDownloadImage}
          />

          <div
            className={`flex-1 overflow-auto bg-zinc-950 p-4 ${
              !showOriginalReference ? "flex items-start justify-center" : ""
            }`}
          >
            <div
              className={`gap-4 ${
                showOriginalReference
                  ? "grid lg:grid-cols-2"
                  : "w-full max-w-fit"
              }`}
            >
              <div
                className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 relative"
                onWheel={handleWheelZoom}
                onScroll={() => syncScroll("main")}
                ref={mainScrollRef}
              >
                {currentTool === "freehand" &&
                  !isAnnotationDrawing &&
                  showFreehandInstructions && (
                    <div className="fixed top-20 left-23 z-10 rounded-lg bg-blue-900/90 border border-blue-700 px-4 py-3 text-sm text-blue-200 shadow-lg backdrop-blur-sm max-w-md">
                      <button
                        onClick={() => setShowFreehandInstructions(false)}
                        className="absolute top-2 right-2 text-blue-300 hover:text-blue-100 transition-colors"
                        aria-label="Close instructions"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="font-medium pr-6">
                        Click to start drawing, then move your mouse to draw.
                      </p>
                      <p className="text-xs text-blue-300 mt-1">
                        Release to finish
                      </p>
                    </div>
                  )}
                {currentTool === "freehand" &&
                  isAnnotationDrawing &&
                  showFreehandInstructions && (
                    <div className="fixed top-22 left-20 z-10 rounded-lg bg-green-900/90 border border-green-700 px-4 py-3 text-sm text-green-200 shadow-lg backdrop-blur-sm max-w-sm">
                      <button
                        onClick={() => setShowFreehandInstructions(false)}
                        className="absolute top-2 right-2 text-green-300 hover:text-green-100 transition-colors"
                        aria-label="Close instructions"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="font-medium pr-6">
                        Drawing... Move mouse to continue
                      </p>
                      <p className="text-xs text-green-300 mt-1">
                        Release to finish • Press ESC to cancel
                      </p>
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
                        width={stageLayout?.width || generatedSize.width}
                        height={stageLayout?.height || generatedSize.height}
                        onMouseDown={handleStageMouseDown}
                        onClick={handleStageClick}
                        onMouseMove={handleStageMouseMove}
                        onMouseUp={handleStageMouseUp}
                        className={`rounded-lg shadow-2xl ${
                          currentTool !== "select"
                            ? "cursor-crosshair"
                            : "cursor-default"
                        }`}
                      >
                        <Layer ref={layerRef}>
                          <Rect
                            x={0}
                            y={0}
                            width={stageLayout?.width || generatedSize.width}
                            height={stageLayout?.height || generatedSize.height}
                            fill="#ffffff"
                            listening={false}
                          />
                          <KonvaImage
                            image={konvaImage}
                            x={stageLayout?.offset || 0}
                            y={stageLayout?.offset || 0}
                          />
                          {annotationsArray
                            .filter((ann) => ann.type !== "textbox")
                            .map((ann) =>
                              renderAnnotationShape(ann, false, {
                                isSelected: selectedAnnotationIds.includes(
                                  ann.id
                                ),
                                onSelect: (id, e) => handleLabelClick(id, e),
                              })
                            )}
                          {renderCurrentDrawing(
                            currentAnnotationPoints,
                            currentTool,
                            annotationColor
                          )}
                          {selectedAnnotations
                            .filter((ann) => ann.type !== "textbox")
                            .flatMap((ann) =>
                              ann.points.map((p, idx) => (
                                <Circle
                                  key={`sel-pt-${ann.id}-${idx}`}
                                  x={p.x}
                                  y={p.y}
                                  radius={4}
                                  fill="#3b82f6"
                                  stroke="#bfdbfe"
                                  strokeWidth={1}
                                  draggable
                                  onMouseDown={(e) => {
                                    e.cancelBubble = true;
                                    handleLabelClick(ann.id, e);
                                  }}
                                  onClick={(e) => {
                                    e.cancelBubble = true;
                                    handleLabelClick(ann.id, e);
                                  }}
                                  onTap={(e) => {
                                    e.cancelBubble = true;
                                    handleLabelClick(ann.id, e);
                                  }}
                                  onDragMove={(e) => {
                                    e.cancelBubble = true;
                                    const pos = e.target.getPosition();
                                    updateAnnotationPoint(
                                      ann.id,
                                      idx,
                                      pos.x,
                                      pos.y
                                    );
                                  }}
                                  onDragEnd={(e) => {
                                    e.cancelBubble = true;
                                    const pos = e.target.getPosition();
                                    updateAnnotationPoint(
                                      ann.id,
                                      idx,
                                      pos.x,
                                      pos.y
                                    );
                                  }}
                                />
                              ))
                            )}
                          {selectionRect && currentTool === "select" && (
                            <Rect
                              x={selectionRect.x}
                              y={selectionRect.y}
                              width={selectionRect.width}
                              height={selectionRect.height}
                              stroke="#3b82f6"
                              strokeWidth={1}
                              dash={[4, 4]}
                              fill="rgba(59, 130, 246, 0.08)"
                              listening={false}
                            />
                          )}
                          {annotationsArray.map((ann) => (
                            <TextLabel
                              key={`label-${ann.id}`}
                              annotation={ann}
                              onDragEnd={handleLabelDragEnd}
                              onTransformEnd={handleLabelTransformEnd}
                              onClick={handleLabelClick}
                              onTextChange={updateAnnotationText}
                              onFinishEditing={() => {
                                setEditingAnnotationId(null)
                              }}
                              isSelected={selectedAnnotationIds.includes(
                                ann.id
                              )}
                              isEditing={editingAnnotationId === ann.id}
                            />
                          ))}
                        </Layer>
                      </Stage>
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
                          src={referenceImageSrc}
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
            annotations={annotationsArray}
            selectedLabelIds={selectedAnnotationIds}
            onSelectAnnotation={(id) => setSelectedAnnotationIds([id])}
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

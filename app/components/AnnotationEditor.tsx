"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import simplify from "simplify-js";
import {
  Annotation,
  AnnotationTool,
  GeneratedImage,
  Point,
} from "../types/landscape";
import {
  ArrowUpRight,
  Check,
  Circle as CircleIcon,
  Loader2,
  MousePointer2,
  Pencil,
  RotateCcw,
  RotateCw,
  Send,
  Square,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Line as LineIcon,
} from "lucide-react";

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

const simplifyAnnotationPoints = (
  points: Point[],
  tolerance: number = 2
): Point[] => {
  if (points.length <= 2) return points;
  const simplifyPoints = points.map((p) => ({ x: p.x, y: p.y }));
  const simplified = simplify(simplifyPoints, tolerance, true);
  return simplified.map((p) => ({ x: p.x, y: p.y }));
};

export const AnnotationEditor = ({
  generatedImage,
  originalCapturedImage,
  onCancel,
  onRevisionComplete,
  onError,
}: AnnotationEditorProps) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
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
  const [showOriginalReference, setShowOriginalReference] = useState(
    !!originalCapturedImage
  );

  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorImageRef = useRef<HTMLImageElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const referenceScrollRef = useRef<HTMLDivElement | null>(null);
  const transformWrapperRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const labelDragRef = useRef<{
    id: string;
    start: Point;
    offset: Point;
  } | null>(null);

  const getAnnotationAnchorPoint = useCallback((ann: Annotation) => {
    const pts = ann.points;
    if (!pts.length) return { x: 0, y: 0 };

    const xs = pts.map((pt) => pt.x);
    const ys = pts.map((pt) => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const margin = 18;

    if (ann.type === "arrow") {
      const head = pts[0];
      return { x: head.x - margin, y: head.y - margin };
    }

    if (ann.type === "circle" || ann.type === "rectangle") {
      return { x: maxX + margin, y: minY - margin };
    }

    const tail = pts[pts.length - 1];
    return { x: tail.x + margin, y: tail.y - margin };
  }, []);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const wrapper = transformWrapperRef.current;
    if (!wrapper) return null;

    const rect = wrapper.getBoundingClientRect();
    const point = new DOMPoint(clientX - rect.left, clientY - rect.top);
    const computedTransform = window.getComputedStyle(wrapper).transform;
    const matrix =
      computedTransform && computedTransform !== "none"
        ? new DOMMatrixReadOnly(computedTransform)
        : new DOMMatrixReadOnly();

    const inverse = matrix.inverse();
    const transformed = inverse.transformPoint(point);

    return { x: transformed.x, y: transformed.y };
  }, []);

  const drawAnnotations = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      anns: Annotation[],
      currentPts?: Point[]
    ) => {
      anns.forEach((ann) => {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const pts = ann.points;
        if (pts.length < 2) return;

        ctx.beginPath();

        switch (ann.type) {
          case "circle": {
            const centerX = (pts[0].x + pts[1].x) / 2;
            const centerY = (pts[0].y + pts[1].y) / 2;
            const radiusX = Math.abs(pts[1].x - pts[0].x) / 2;
            const radiusY = Math.abs(pts[1].y - pts[0].y) / 2;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            break;
          }
          case "rectangle":
            ctx.rect(
              pts[0].x,
              pts[0].y,
              pts[1].x - pts[0].x,
              pts[1].y - pts[0].y
            );
            break;
          case "line":
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            break;
          case "arrow": {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
            const arrowSize = 15;
            ctx.lineTo(
              pts[1].x - arrowSize * Math.cos(angle - Math.PI / 6),
              pts[1].y - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(pts[1].x, pts[1].y);
            ctx.lineTo(
              pts[1].x - arrowSize * Math.cos(angle + Math.PI / 6),
              pts[1].y - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            break;
          }
          case "freehand":
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
            break;
        }

        ctx.stroke();

        if (ann.text) {
          const anchor = getAnnotationAnchorPoint(ann);
          const offset = ann.labelOffset || { x: 0, y: 0 };
          let labelX = anchor.x + offset.x;
          let labelY = anchor.y + offset.y;
          const padding = 6;
          const baselineHeight = 14;

          ctx.font = "bold 14px system-ui";
          ctx.fillStyle = ann.color;
          const textMetrics = ctx.measureText(ann.text);
          const bgWidth = textMetrics.width + padding * 2;
          const bgHeight = 18 + padding * 2;

          let bgLeft = labelX - padding;
          let bgTop = labelY - baselineHeight - padding;
          const canvasWidth = ctx.canvas.width;
          const canvasHeight = ctx.canvas.height;
          const guard = 8;

          if (bgLeft < guard) {
            labelX += guard - bgLeft;
            bgLeft = guard;
          }
          if (bgTop < guard) {
            labelY += guard - bgTop;
            bgTop = guard;
          }
          if (bgLeft + bgWidth > canvasWidth - guard) {
            const delta = bgLeft + bgWidth - (canvasWidth - guard);
            labelX -= delta;
            bgLeft -= delta;
          }
          if (bgTop + bgHeight > canvasHeight - guard) {
            const delta = bgTop + bgHeight - (canvasHeight - guard);
            labelY -= delta;
            bgTop -= delta;
          }

          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(bgLeft, bgTop, bgWidth, bgHeight);

          ctx.fillStyle = ann.color;
          ctx.fillText(ann.text, labelX, labelY);
        }
      });

      if (currentPts && currentPts.length >= 2 && currentTool !== "select") {
        ctx.strokeStyle = annotationColor;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([5, 5]);

        ctx.beginPath();

        switch (currentTool) {
          case "circle": {
            const centerX = (currentPts[0].x + currentPts[1].x) / 2;
            const centerY = (currentPts[0].y + currentPts[1].y) / 2;
            const radiusX = Math.abs(currentPts[1].x - currentPts[0].x) / 2;
            const radiusY = Math.abs(currentPts[1].y - currentPts[0].y) / 2;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            break;
          }
          case "rectangle":
            ctx.rect(
              currentPts[0].x,
              currentPts[0].y,
              currentPts[1].x - currentPts[0].x,
              currentPts[1].y - currentPts[0].y
            );
            break;
          case "line":
            ctx.moveTo(currentPts[0].x, currentPts[0].y);
            ctx.lineTo(currentPts[1].x, currentPts[1].y);
            break;
          case "arrow": {
            ctx.moveTo(currentPts[0].x, currentPts[0].y);
            ctx.lineTo(currentPts[1].x, currentPts[1].y);
            const angle = Math.atan2(
              currentPts[1].y - currentPts[0].y,
              currentPts[1].x - currentPts[0].x
            );
            const arrowSize = 15;
            ctx.lineTo(
              currentPts[1].x - arrowSize * Math.cos(angle - Math.PI / 6),
              currentPts[1].y - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(currentPts[1].x, currentPts[1].y);
            ctx.lineTo(
              currentPts[1].x - arrowSize * Math.cos(angle + Math.PI / 6),
              currentPts[1].y - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            break;
          }
          case "freehand":
            ctx.moveTo(currentPts[0].x, currentPts[0].y);
            currentPts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
            break;
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [currentTool, getAnnotationAnchorPoint]
  );

  const handleEditorMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (currentTool === "select") return;

      const canvasPoint = getCanvasPoint(e.clientX, e.clientY);
      if (!canvasPoint) return;

      setIsAnnotationDrawing(true);
      setCurrentAnnotationPoints([{ x: canvasPoint.x, y: canvasPoint.y }]);
    },
    [currentTool, getCanvasPoint]
  );

  const handleEditorMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAnnotationDrawing || currentTool === "select") return;

      const canvasPoint = getCanvasPoint(e.clientX, e.clientY);
      if (!canvasPoint) return;

      if (currentTool === "freehand") {
        setCurrentAnnotationPoints((prev) => [
          ...prev,
          { x: canvasPoint.x, y: canvasPoint.y },
        ]);
      } else {
        setCurrentAnnotationPoints((prev) => [
          prev[0],
          { x: canvasPoint.x, y: canvasPoint.y },
        ]);
      }
    },
    [isAnnotationDrawing, currentTool, getCanvasPoint]
  );

  const handleEditorMouseUp = useCallback(() => {
    if (!isAnnotationDrawing || currentTool === "select") return;

    setIsAnnotationDrawing(false);

    let finalPoints = currentAnnotationPoints;
    if (currentTool === "freehand") {
      finalPoints = simplifyAnnotationPoints(currentAnnotationPoints, 3);
    }

    if (
      finalPoints.length >= 1 &&
      (currentTool === "freehand"
        ? finalPoints.length >= 2
        : finalPoints.length >= 2)
    ) {
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        type: currentTool,
        points: finalPoints,
        text: "",
        color: annotationColor,
        isEditing: true,
        labelOffset: { x: 0, y: 0 },
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
    }

    setCurrentAnnotationPoints([]);
  }, [
    isAnnotationDrawing,
    currentTool,
    currentAnnotationPoints,
  ]);

  const updateAnnotationText = useCallback((id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, text } : ann))
    );
  }, []);

  const finishAnnotationEdit = useCallback((id: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, isEditing: false } : ann))
    );
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
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

    window.addEventListener("wheel", preventBrowserZoom, { passive: false });
    window.addEventListener("keydown", preventKeyZoom);

    return () => {
      window.removeEventListener("wheel", preventBrowserZoom);
      window.removeEventListener("keydown", preventKeyZoom);
    };
  }, []);

  useEffect(() => {
    const canvas = editorCanvasRef.current;
    if (!generatedImage || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      setGeneratedSize({ width: img.width, height: img.height });
      ctx.drawImage(img, 0, 0);
      drawAnnotations(
        ctx,
        annotations,
        currentAnnotationPoints.length >= 2
          ? currentAnnotationPoints
          : undefined
      );
      editorImageRef.current = img;
    };
    img.src = `data:${generatedImage.mimeType};base64,${generatedImage.image}`;
  }, [generatedImage, annotations, currentAnnotationPoints, drawAnnotations]);

  const referenceScaleBoost = 1.2;

  const referenceScale = useMemo(() => {
    if (!showOriginalReference || !generatedSize || !referenceSize) return 1;
    if (referenceSize.width === 0) return 1;
    return (generatedSize.width / referenceSize.width) * referenceScaleBoost;
  }, [generatedSize, referenceSize, showOriginalReference]);

  const sendForRevision = useCallback(async () => {
    if (!generatedImage || annotations.length === 0) return;

    setIsRevising(true);

    try {
      const canvas = document.createElement("canvas");
      const img = editorImageRef.current;
      if (!img) throw new Error("Image not loaded");

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(img, 0, 0);
      drawAnnotations(ctx, annotations);

      const dataUrl = canvas.toDataURL("image/png");
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
    generatedImage,
    annotations,
    drawAnnotations,
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

  const handleLabelDragStart = useCallback(
    (ann: Annotation, e: React.MouseEvent) => {
      const canvasPoint = getCanvasPoint(e.clientX, e.clientY);
      if (!canvasPoint) return;
      e.preventDefault();
      labelDragRef.current = {
        id: ann.id,
        start: canvasPoint,
        offset: ann.labelOffset || { x: 0, y: 0 },
      };
    },
    [getCanvasPoint]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!labelDragRef.current) return;
      const canvasPoint = getCanvasPoint(e.clientX, e.clientY);
      if (!canvasPoint) return;
      const { id, start, offset } = labelDragRef.current;
      const dx = canvasPoint.x - start.x;
      const dy = canvasPoint.y - start.y;
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === id
            ? { ...ann, labelOffset: { x: offset.x + dx, y: offset.y + dy } }
            : ann
        )
      );
    };

    const handleUp = () => {
      labelDragRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [getCanvasPoint]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-0 z-50 flex bg-zinc-900">
      <div className="flex w-16 flex-col items-center gap-1 border-r border-zinc-700 bg-zinc-800 py-4">
        <button
          onClick={() => setCurrentTool("select")}
          className={`rounded-lg p-3 transition-colors ${
            currentTool === "select"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
          title="Select"
        >
          <MousePointer2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentTool("circle")}
          className={`rounded-lg p-3 transition-colors ${
            currentTool === "circle"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
          title="Circle/Ellipse"
        >
          <CircleIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentTool("rectangle")}
          className={`rounded-lg p-3 transition-colors ${
            currentTool === "rectangle"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
          title="Rectangle"
        >
          <Square className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentTool("line")}
          className={`rounded-lg p-3 transition-colors ${
            currentTool === "line"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
          title="Line"
        >
          <LineIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentTool("arrow")}
          className={`rounded-lg p-3 transition-colors ${
            currentTool === "arrow"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
          title="Arrow"
        >
          <ArrowUpRight className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentTool("freehand")}
          className={`rounded-lg p-3 transition-colors ${
            currentTool === "freehand"
              ? "bg-blue-600 text-white"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
          title="Freehand"
        >
          <Pencil className="h-5 w-5" />
        </button>

        <div className="my-2 h-px w-10 bg-zinc-600" />

        <button
          onClick={zoomIn}
          className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Zoom In (Ctrl+Scroll)"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={zoomOut}
          className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Zoom Out (Ctrl+Scroll)"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={rotateLeft}
          className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Rotate Left"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          onClick={rotateRight}
          className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Rotate Right"
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Annotation Editor
              </h2>
              <p className="text-xs text-zinc-400">
                Draw shapes and add annotations, then send for AI revision.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAnnotations([])}
              className="w-full rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white sm:w-auto"
              disabled={annotations.length === 0}
            >
              Clear All
            </button>
            <button
              onClick={onCancel}
              className="w-full rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                setShowOriginalReference((prev) => !prev)
              }
              disabled={!originalCapturedImage}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:w-auto ${
                showOriginalReference
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "bg-zinc-600 text-white hover:bg-zinc-500"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {showOriginalReference ? "Hide Original" : "Show Original"}
            </button>
            <button
              onClick={sendForRevision}
              disabled={annotations.length === 0 || isRevising}
              className="w-full rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isRevising ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Revising...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send for Revision
                </span>
              )}
            </button>
          </div>
        </div>

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
              <div
                className="relative inline-block transition-transform duration-200"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  transformOrigin: "top left",
                }}
              ref={transformWrapperRef}
              >
                <canvas
                  ref={editorCanvasRef}
                  onMouseDown={handleEditorMouseDown}
                  onMouseMove={handleEditorMouseMove}
                  onMouseUp={handleEditorMouseUp}
                  onMouseLeave={handleEditorMouseUp}
                  className={`rounded-lg shadow-2xl ${
                    currentTool !== "select"
                      ? "cursor-crosshair"
                      : "cursor-default"
                  }`}
                />

                {annotations.map((ann) => {
                  const { x: anchorX, y: anchorY } =
                    getAnnotationAnchorPoint(ann);
                  const offset = ann.labelOffset || { x: 0, y: 0 };
                  const posX = anchorX + offset.x;
                  const posY = anchorY + offset.y - 10;

                  return (
                    <button
                      key={`${ann.id}-handle`}
                      onMouseDown={(e) => handleLabelDragStart(ann, e)}
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-600 bg-zinc-800 p-1 text-white shadow hover:bg-zinc-700 cursor-grab active:cursor-grabbing"
                      style={{
                        left: posX,
                        top: posY,
                        transform: `rotate(${-imageRotation}deg) scale(${
                          1 / imageZoom
                        }) translate(-50%, -50%)`,
                        transformOrigin: "center",
                      }}
                      title="Drag annotation label"
                    >
                      <MousePointer2 className="h-4 w-4" />
                    </button>
                  );
                })}

                {annotations
                  .filter((ann) => ann.isEditing)
                  .map((ann) => {
                    const canvas = editorCanvasRef.current;
                    const canvasWidth = canvas?.width || 800;
                    const canvasHeight = canvas?.height || 600;

                    const { x: anchorX, y: anchorY } =
                      getAnnotationAnchorPoint(ann);
                    const offset = ann.labelOffset || { x: 0, y: 0 };
                    const inputWidth = 280;
                    const inputHeight = 50;
                    const guard = 10;

                    let posX = anchorX + offset.x;
                    let posY = anchorY + offset.y;

                    if (posX + inputWidth > canvasWidth - guard) {
                      posX = canvasWidth - inputWidth - guard;
                    }
                    if (posY + inputHeight > canvasHeight - guard) {
                      posY = canvasHeight - inputHeight - guard;
                    }
                    posX = Math.max(guard, posX);
                    posY = Math.max(guard, posY);

                    return (
                      <div
                        key={ann.id}
                        className="absolute z-10"
                        style={{
                          left: posX,
                          top: posY,
                          transform: `rotate(${-imageRotation}deg) scale(${
                            1 / imageZoom
                          })`,
                          transformOrigin: "top left",
                        }}
                      >
                        <div className="flex items-start gap-2 rounded-lg bg-zinc-800 p-2 shadow-xl border border-zinc-600">
                          <textarea
                            value={ann.text}
                            onChange={(e) =>
                              updateAnnotationText(ann.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                finishAnnotationEdit(ann.id);
                              }
                            }}
                            placeholder="Add annotation... (Shift+Enter for new line)"
                            className="w-52 min-h-[32px] max-h-24 resize-y rounded bg-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            rows={1}
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => finishAnnotationEdit(ann.id)}
                              className="rounded bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                              title="Save (Enter)"
                            >
                            <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteAnnotation(ann.id)}
                              className="rounded bg-red-600 p-1.5 text-white hover:bg-red-700"
                              title="Delete"
                            >
                            <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

        {annotations.length > 0 && (
          <div className="border-t border-zinc-700 bg-zinc-800 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-center gap-2 rounded-full bg-zinc-700 px-3 py-1 text-sm max-w-xs"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: ann.color }}
                  />
                  <span className="text-white truncate">
                    {ann.text || `${ann.type} annotation`}
                  </span>
                  <button
                    onClick={() => deleteAnnotation(ann.id)}
                    className="shrink-0 text-zinc-400 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

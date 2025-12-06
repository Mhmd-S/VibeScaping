'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import simplify from 'simplify-js';
import {
    Annotation,
    AnnotationTool,
    GeneratedImage,
    Point,
} from '../types/landscape';

interface AnnotationEditorProps {
    generatedImage: GeneratedImage;
    onCancel: () => void;
    onRevisionComplete: (data: {
        image: string;
        mimeType: string;
        description?: string;
        annotations: string[];
    }) => void;
    onError: (message: string) => void;
}

const simplifyAnnotationPoints = (points: Point[], tolerance: number = 2): Point[] => {
    if (points.length <= 2) return points;
    const simplifyPoints = points.map((p) => ({ x: p.x, y: p.y }));
    const simplified = simplify(simplifyPoints, tolerance, true);
    return simplified.map((p) => ({ x: p.x, y: p.y }));
};

export const AnnotationEditor = ({
    generatedImage,
    onCancel,
    onRevisionComplete,
    onError,
}: AnnotationEditorProps) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentTool, setCurrentTool] = useState<AnnotationTool>('select');
    const [annotationColor, setAnnotationColor] = useState('#ef4444');
    const [isAnnotationDrawing, setIsAnnotationDrawing] = useState(false);
    const [currentAnnotationPoints, setCurrentAnnotationPoints] = useState<Point[]>([]);
    const [isRevising, setIsRevising] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);

    const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const editorImageRef = useRef<HTMLImageElement | null>(null);

    const drawAnnotations = useCallback((ctx: CanvasRenderingContext2D, anns: Annotation[], currentPts?: Point[]) => {
        anns.forEach((ann) => {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const pts = ann.points;
            if (pts.length < 2) return;

            ctx.beginPath();

            switch (ann.type) {
                case 'circle': {
                    const centerX = (pts[0].x + pts[1].x) / 2;
                    const centerY = (pts[0].y + pts[1].y) / 2;
                    const radiusX = Math.abs(pts[1].x - pts[0].x) / 2;
                    const radiusY = Math.abs(pts[1].y - pts[0].y) / 2;
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                    break;
                }
                case 'rectangle':
                    ctx.rect(pts[0].x, pts[0].y, pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                    break;
                case 'line':
                    ctx.moveTo(pts[0].x, pts[0].y);
                    ctx.lineTo(pts[1].x, pts[1].y);
                    break;
                case 'arrow': {
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
                case 'freehand':
                    ctx.moveTo(pts[0].x, pts[0].y);
                    pts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
                    break;
            }

            ctx.stroke();

            if (ann.text) {
                const labelX = ann.type === 'circle' || ann.type === 'rectangle'
                    ? (pts[0].x + pts[1].x) / 2
                    : pts[pts.length - 1].x + 10;
                const labelY = ann.type === 'circle' || ann.type === 'rectangle'
                    ? (pts[0].y + pts[1].y) / 2
                    : pts[pts.length - 1].y;

                ctx.font = 'bold 14px system-ui';
                ctx.fillStyle = ann.color;
                const textMetrics = ctx.measureText(ann.text);
                const padding = 4;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    labelX - padding,
                    labelY - 14 - padding,
                    textMetrics.width + padding * 2,
                    18 + padding * 2
                );

                ctx.fillStyle = ann.color;
                ctx.fillText(ann.text, labelX, labelY);
            }
        });

        if (currentPts && currentPts.length >= 2 && currentTool !== 'select') {
            ctx.strokeStyle = annotationColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([5, 5]);

            ctx.beginPath();

            switch (currentTool) {
                case 'circle': {
                    const centerX = (currentPts[0].x + currentPts[1].x) / 2;
                    const centerY = (currentPts[0].y + currentPts[1].y) / 2;
                    const radiusX = Math.abs(currentPts[1].x - currentPts[0].x) / 2;
                    const radiusY = Math.abs(currentPts[1].y - currentPts[0].y) / 2;
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                    break;
                }
                case 'rectangle':
                    ctx.rect(currentPts[0].x, currentPts[0].y, currentPts[1].x - currentPts[0].x, currentPts[1].y - currentPts[0].y);
                    break;
                case 'line':
                    ctx.moveTo(currentPts[0].x, currentPts[0].y);
                    ctx.lineTo(currentPts[1].x, currentPts[1].y);
                    break;
                case 'arrow': {
                    ctx.moveTo(currentPts[0].x, currentPts[0].y);
                    ctx.lineTo(currentPts[1].x, currentPts[1].y);
                    const angle = Math.atan2(currentPts[1].y - currentPts[0].y, currentPts[1].x - currentPts[0].x);
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
                case 'freehand':
                    ctx.moveTo(currentPts[0].x, currentPts[0].y);
                    currentPts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
                    break;
            }

            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [currentTool, annotationColor]);

    const handleEditorMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentTool === 'select') return;

        const canvas = editorCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsAnnotationDrawing(true);
        setCurrentAnnotationPoints([{ x, y }]);
    }, [currentTool]);

    const handleEditorMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAnnotationDrawing || currentTool === 'select') return;

        const canvas = editorCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentTool === 'freehand') {
            setCurrentAnnotationPoints((prev) => [...prev, { x, y }]);
        } else {
            setCurrentAnnotationPoints((prev) => [prev[0], { x, y }]);
        }
    }, [isAnnotationDrawing, currentTool]);

    const handleEditorMouseUp = useCallback(() => {
        if (!isAnnotationDrawing || currentTool === 'select') return;

        setIsAnnotationDrawing(false);

        let finalPoints = currentAnnotationPoints;
        if (currentTool === 'freehand') {
            finalPoints = simplifyAnnotationPoints(currentAnnotationPoints, 3);
        }

        if (finalPoints.length >= 1 && (currentTool === 'freehand' ? finalPoints.length >= 2 : finalPoints.length >= 2)) {
            const newAnnotation: Annotation = {
                id: `ann-${Date.now()}`,
                type: currentTool,
                points: finalPoints,
                text: '',
                color: annotationColor,
                isEditing: true,
            };
            setAnnotations((prev) => [...prev, newAnnotation]);
        }

        setCurrentAnnotationPoints([]);
    }, [isAnnotationDrawing, currentTool, currentAnnotationPoints, annotationColor]);

    const updateAnnotationText = useCallback((id: string, text: string) => {
        setAnnotations((prev) =>
            prev.map((ann) =>
                ann.id === id ? { ...ann, text } : ann
            )
        );
    }, []);

    const finishAnnotationEdit = useCallback((id: string) => {
        setAnnotations((prev) =>
            prev.map((ann) =>
                ann.id === id ? { ...ann, isEditing: false } : ann
            )
        );
    }, []);

    const deleteAnnotation = useCallback((id: string) => {
        setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
    }, []);

    useEffect(() => {
        const canvas = editorCanvasRef.current;
        if (!generatedImage || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            drawAnnotations(ctx, annotations, currentAnnotationPoints.length >= 2 ? currentAnnotationPoints : undefined);
            editorImageRef.current = img;
        };
        img.src = `data:${generatedImage.mimeType};base64,${generatedImage.image}`;
    }, [generatedImage, annotations, currentAnnotationPoints, drawAnnotations]);

    const sendForRevision = useCallback(async () => {
        if (!generatedImage || annotations.length === 0) return;

        setIsRevising(true);

        try {
            const canvas = document.createElement('canvas');
            const img = editorImageRef.current;
            if (!img) throw new Error('Image not loaded');

            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            ctx.drawImage(img, 0, 0);
            drawAnnotations(ctx, annotations);

            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];

            const annotationTexts = annotations
                .filter((ann) => ann.text)
                .map((ann) => ann.text);

            const response = await fetch('/api/generate-landscape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: 'image/png',
                    isRevision: true,
                    revisionNotes: annotationTexts,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to revise landscape');
            }

            onRevisionComplete({
                image: data.image,
                mimeType: data.mimeType,
                description: data.description,
                annotations: annotationTexts,
            });
            setAnnotations([]);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to revise landscape. Please try again.');
        } finally {
            setIsRevising(false);
        }
    }, [generatedImage, annotations, drawAnnotations, onRevisionComplete, onError]);

    const zoomIn = useCallback(() => {
        setImageZoom((prev) => Math.min(prev * 1.25, 4));
    }, []);

    const zoomOut = useCallback(() => {
        setImageZoom((prev) => Math.max(prev / 1.25, 0.25));
    }, []);

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

    const handleWheelZoom = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    }, [zoomIn, zoomOut]);

    return (
        <div className="fixed inset-0 z-50 flex bg-zinc-900">
            <div className="flex w-16 flex-col items-center gap-1 border-r border-zinc-700 bg-zinc-800 py-4">
                <button
                    onClick={() => setCurrentTool('select')}
                    className={`rounded-lg p-3 transition-colors ${currentTool === 'select' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Select"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentTool('circle')}
                    className={`rounded-lg p-3 transition-colors ${currentTool === 'circle' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Circle/Ellipse"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentTool('rectangle')}
                    className={`rounded-lg p-3 transition-colors ${currentTool === 'rectangle' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Rectangle"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentTool('line')}
                    className={`rounded-lg p-3 transition-colors ${currentTool === 'line' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Line"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentTool('arrow')}
                    className={`rounded-lg p-3 transition-colors ${currentTool === 'arrow' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Arrow"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentTool('freehand')}
                    className={`rounded-lg p-3 transition-colors ${currentTool === 'freehand' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    title="Freehand"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>

                <div className="my-2 h-px w-10 bg-zinc-600" />

                <div className="flex flex-col gap-1">
                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'].map((color) => (
                        <button
                            key={color}
                            onClick={() => setAnnotationColor(color)}
                            className={`h-6 w-6 rounded-full border-2 transition-transform ${annotationColor === color ? 'scale-110 border-white' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                </div>

                <div className="my-2 h-px w-10 bg-zinc-600" />

                <button
                    onClick={zoomIn}
                    className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    title="Zoom In (Ctrl+Scroll)"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                </button>
                <button
                    onClick={zoomOut}
                    className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    title="Zoom Out (Ctrl+Scroll)"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                </button>
                <button
                    onClick={rotateLeft}
                    className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    title="Rotate Left"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                <button
                    onClick={rotateRight}
                    className="rounded-lg p-3 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    title="Rotate Right"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Annotation Editor</h2>
                            <p className="text-xs text-zinc-400">
                                Draw shapes and add annotations, then send for AI revision
                            </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-zinc-700 px-3 py-1.5">
                            <span className="text-xs text-zinc-400">
                                {Math.round(imageZoom * 100)}% • {imageRotation}°
                            </span>
                            <button
                                onClick={() => { resetZoom(); resetRotation(); }}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAnnotations([])}
                            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                            disabled={annotations.length === 0}
                        >
                            Clear All
                        </button>
                        <button
                            onClick={onCancel}
                            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={sendForRevision}
                            disabled={annotations.length === 0 || isRevising}
                            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isRevising ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Revising...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Send for Revision
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div
                    className="flex-1 overflow-auto bg-zinc-950 p-4"
                    onWheel={handleWheelZoom}
                >
                    <div
                        className="relative inline-block transition-transform duration-200"
                        style={{
                            transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                            transformOrigin: 'top left',
                        }}
                    >
                        <canvas
                            ref={editorCanvasRef}
                            onMouseDown={handleEditorMouseDown}
                            onMouseMove={handleEditorMouseMove}
                            onMouseUp={handleEditorMouseUp}
                            onMouseLeave={handleEditorMouseUp}
                            className={`rounded-lg shadow-2xl ${currentTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
                        />

                        {annotations.filter((ann) => ann.isEditing).map((ann) => {
                            const pts = ann.points;
                            const canvas = editorCanvasRef.current;
                            const canvasWidth = canvas?.width || 800;
                            const canvasHeight = canvas?.height || 600;

                            let posX = ann.type === 'circle' || ann.type === 'rectangle'
                                ? (pts[0].x + pts[1].x) / 2
                                : pts[pts.length - 1].x + 15;
                            let posY = ann.type === 'circle' || ann.type === 'rectangle'
                                ? (pts[0].y + pts[1].y) / 2 + 30
                                : pts[pts.length - 1].y + 20;

                            const inputWidth = 280;
                            const inputHeight = 50;

                            if (posX + inputWidth > canvasWidth) {
                                posX = Math.max(10, canvasWidth - inputWidth - 10);
                            }
                            if (posY + inputHeight > canvasHeight) {
                                posY = Math.max(10, canvasHeight - inputHeight - 10);
                            }
                            posX = Math.max(10, posX);
                            posY = Math.max(10, posY);

                            return (
                                <div
                                    key={ann.id}
                                    className="absolute z-10"
                                    style={{
                                        left: posX,
                                        top: posY,
                                        transform: `rotate(${-imageRotation}deg) scale(${1 / imageZoom})`,
                                        transformOrigin: 'top left',
                                    }}
                                >
                                    <div className="flex items-start gap-2 rounded-lg bg-zinc-800 p-2 shadow-xl border border-zinc-600">
                                        <textarea
                                            value={ann.text}
                                            onChange={(e) => updateAnnotationText(ann.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
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
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => deleteAnnotation(ann.id)}
                                                className="rounded bg-red-600 p-1.5 text-white hover:bg-red-700"
                                                title="Delete"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
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


'use client';

import { useCallback, useMemo, useState } from 'react';
import { GeneratedImage, RevisionNode } from '../types/landscape';

interface PreviewModalProps {
    generatedImage: GeneratedImage;
    originalCapturedImage: GeneratedImage | null;
    revisionHistory: RevisionNode[];
    currentRevisionId: string | null;
    onClose: () => void;
    onEdit: () => void;
    onDownload: () => void;
    onSwitchRevision: (revisionId: string) => void;
}

export const PreviewModal = ({
    generatedImage,
    originalCapturedImage,
    revisionHistory,
    currentRevisionId,
    onClose,
    onEdit,
    onDownload,
    onSwitchRevision,
}: PreviewModalProps) => {
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);

    const zoomIn = useCallback(() => setImageZoom((prev) => Math.min(prev * 1.25, 4)), []);
    const zoomOut = useCallback(() => setImageZoom((prev) => Math.max(prev / 1.25, 0.25)), []);
    const resetZoom = useCallback(() => setImageZoom(1), []);
    const rotateLeft = useCallback(() => setImageRotation((prev) => (prev - 90) % 360), []);
    const rotateRight = useCallback(() => setImageRotation((prev) => (prev + 90) % 360), []);
    const resetRotation = useCallback(() => setImageRotation(0), []);

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

    const revisionDepths = useMemo(() => {
        const depthMap: Record<string, number> = {};
        const getDepth = (revisionId: string | null): number => {
            if (!revisionId) return 0;
            const revision = revisionHistory.find((r) => r.id === revisionId);
            if (!revision || !revision.parentId) return 0;
            if (depthMap[revision.parentId] !== undefined) {
                return depthMap[revision.parentId] + 1;
            }
            const depth = 1 + getDepth(revision.parentId);
            depthMap[revisionId] = depth;
            return depth;
        };

        revisionHistory.forEach((rev) => {
            depthMap[rev.id] = getDepth(rev.id);
        });
        return depthMap;
    }, [revisionHistory]);

    const revisionChildren = useMemo(() => {
        const childrenMap: Record<string, RevisionNode[]> = {};
        revisionHistory.forEach((rev) => {
            const key = rev.parentId ?? 'root';
            if (!childrenMap[key]) childrenMap[key] = [];
            childrenMap[key].push(rev);
        });
        return childrenMap;
    }, [revisionHistory]);

    return (
        <div className="fixed inset-0 z-50 flex bg-black/80">
            {showHistoryPanel && revisionHistory.length > 0 && (
                <div className="w-72 shrink-0 border-r border-zinc-700 bg-zinc-900 overflow-y-auto">
                    <div className="sticky top-0 z-10 border-b border-zinc-700 bg-zinc-900 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white">Revision History</h3>
                            <button
                                onClick={() => setShowHistoryPanel(false)}
                                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                            Click to view • Branch from any revision
                        </p>
                    </div>
                    <div className="p-3 space-y-1">
                        {revisionHistory.map((revision) => {
                            const depth = revisionDepths[revision.id] ?? 0;
                            const isActive = currentRevisionId === revision.id;
                            const hasChildren = (revisionChildren[revision.id] ?? []).length > 0;

                            return (
                                <button
                                    key={revision.id}
                                    onClick={() => onSwitchRevision(revision.id)}
                                    className={`w-full text-left rounded-lg p-2 transition-colors ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-zinc-300 hover:bg-zinc-800'
                                    }`}
                                    style={{ marginLeft: depth * 16 }}
                                >
                                    <div className="flex items-center gap-2">
                                        {depth > 0 && (
                                            <svg className="h-3 w-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                            </svg>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-400'}`} />
                                                <span className="text-sm font-medium truncate">
                                                    {revision.label || 'Revision'}
                                                </span>
                                                {hasChildren && (
                                                    <svg className="h-3 w-3 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-200' : 'text-zinc-500'}`}>
                                                {new Date(revision.timestamp).toLocaleTimeString()}
                                            </div>
                                            {revision.annotations.length > 0 && (
                                                <div className={`text-xs mt-1 truncate ${isActive ? 'text-blue-200' : 'text-zinc-500'}`}>
                                                    {revision.annotations.length} annotation{revision.annotations.length !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <div className="relative max-h-[90vh] w-full max-w-4xl mx-auto overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 m-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
                        <div className="flex items-center gap-3">
                            {revisionHistory.length > 1 && (
                                <button
                                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                                    className={`rounded-lg p-2 transition-colors ${
                                        showHistoryPanel
                                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                                    }`}
                                    title="Revision History"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    Landscape Architecture Map
                                </h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Generated by Nano Banana Pro
                                    {revisionHistory.length > 1 && ` • ${revisionHistory.find((r) => r.id === currentRevisionId)?.label || 'Revision'}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                                <button
                                    onClick={zoomOut}
                                    className="rounded p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    title="Zoom Out"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={resetZoom}
                                    className="px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 rounded dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    title="Reset Zoom"
                                >
                                    {Math.round(imageZoom * 100)}%
                                </button>
                                <button
                                    onClick={zoomIn}
                                    className="rounded p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    title="Zoom In"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                                <button
                                    onClick={rotateLeft}
                                    className="rounded p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    title="Rotate Left"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>
                                <button
                                    onClick={resetRotation}
                                    className={`px-2 py-1 text-xs font-medium rounded ${
                                        imageRotation !== 0
                                            ? 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900'
                                            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700'
                                    }`}
                                    title="Reset Rotation"
                                >
                                    {imageRotation}°
                                </button>
                                <button
                                    onClick={rotateRight}
                                    className="rounded p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                    title="Rotate Right"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                    </svg>
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div
                        className="overflow-auto p-4"
                        style={{ maxHeight: 'calc(90vh - 140px)' }}
                        onWheel={handleWheelZoom}
                    >
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-700">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Original Map</h3>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Reference</span>
                                </div>
                                <div className="flex items-center justify-center min-h-[260px] p-2">
                                    {originalCapturedImage ? (
                                        <img
                                            src={`data:${originalCapturedImage.mimeType};base64,${originalCapturedImage.image}`}
                                            alt="Original map capture"
                                            className="max-h-[520px] max-w-full rounded-lg shadow-md"
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                                            The original map will appear here after capture.
                                        </p>
                                    )}
                                </div>
                                {originalCapturedImage?.description && (
                                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                        {originalCapturedImage.description}
                                    </p>
                                )}
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-700">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Generated Design</h3>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">AI output</span>
                                </div>
                                <div className="flex items-center justify-center min-h-[260px] p-2">
                                    <img
                                        src={`data:${generatedImage.mimeType};base64,${generatedImage.image}`}
                                        alt="Generated Landscape Architecture Map"
                                        className="max-h-[520px] max-w-full rounded-lg shadow-md transition-transform duration-200"
                                        style={{
                                            transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                                            transformOrigin: 'center center',
                                        }}
                                    />
                                </div>
                                {generatedImage.description && (
                                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                        {generatedImage.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-zinc-200 p-4 dark:border-zinc-700">
                        <button
                            onClick={onEdit}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit & Annotate
                            </span>
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Close
                            </button>
                            <button
                                onClick={onDownload}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                            >
                                Download Image
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


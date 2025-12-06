'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnnotationEditor } from '../components/AnnotationEditor';
import { GeneratedImage, RevisionNode } from '../types/landscape';
import {
    clearGenerationSession,
    loadGenerationSession,
    saveGenerationSession,
} from '../utils/generationSession';

const EditorPage = () => {
    const router = useRouter();
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
    const [originalCapturedImage, setOriginalCapturedImage] = useState<GeneratedImage | null>(null);
    const [revisionHistory, setRevisionHistory] = useState<RevisionNode[]>([]);
    const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const session = loadGenerationSession();
        if (!session) {
            setLoadError('No generated landscape found. Please create one on the map page first.');
            return;
        }

        setGeneratedImage(session.generatedImage);
        setOriginalCapturedImage(session.originalCapturedImage);
        setRevisionHistory(session.revisionHistory);
        setCurrentRevisionId(session.currentRevisionId);
    }, []);

    const persistSession = useCallback((next: {
        generatedImage: GeneratedImage;
        revisionHistory: RevisionNode[];
        currentRevisionId: string | null;
    }) => {
        saveGenerationSession({
            generatedImage: next.generatedImage,
            originalCapturedImage,
            revisionHistory: next.revisionHistory,
            currentRevisionId: next.currentRevisionId,
            isReplicaApproved: true,
        });
    }, [originalCapturedImage]);

    const handleRevisionComplete = useCallback((data: {
        image: string;
        mimeType: string;
        description?: string;
        annotations: string[];
    }) => {
        const newRevisionId = `rev-${Date.now()}`;
        const newRevision: RevisionNode = {
            id: newRevisionId,
            parentId: currentRevisionId,
            image: data.image,
            mimeType: data.mimeType,
            annotations: data.annotations,
            timestamp: Date.now(),
            label: `Revision ${revisionHistory.length}`,
        };

        const updatedHistory = [...revisionHistory, newRevision];
        setGeneratedImage({
            image: data.image,
            mimeType: data.mimeType,
            description: data.description,
        });
        setRevisionHistory(updatedHistory);
        setCurrentRevisionId(newRevisionId);

        persistSession({
            generatedImage: {
                image: data.image,
                mimeType: data.mimeType,
                description: data.description,
            },
            revisionHistory: updatedHistory,
            currentRevisionId: newRevisionId,
        });
    }, [currentRevisionId, revisionHistory, persistSession]);

    const switchToRevision = useCallback((revisionId: string) => {
        const revision = revisionHistory.find((r) => r.id === revisionId);
        if (!revision) return;

        setGeneratedImage({
            image: revision.image,
            mimeType: revision.mimeType,
        });
        setCurrentRevisionId(revisionId);

        persistSession({
            generatedImage: {
                image: revision.image,
                mimeType: revision.mimeType,
            },
            revisionHistory,
            currentRevisionId: revisionId,
        });
    }, [revisionHistory, persistSession]);

    const handleClearSession = useCallback(() => {
        clearGenerationSession();
        setGeneratedImage(null);
        setOriginalCapturedImage(null);
        setRevisionHistory([]);
        setCurrentRevisionId(null);
        setLoadError('Session cleared. Go back to the map page to start a new design.');
    }, []);

    const handleDownload = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = `data:${generatedImage.mimeType};base64,${generatedImage.image}`;
        link.download = `landscape-map-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    if (loadError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
                    <h2 className="mb-3 text-xl font-semibold text-black dark:text-zinc-50">
                        Nothing to Annotate
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        {loadError}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Go to Map
                        </button>
                        <button
                            onClick={handleClearSession}
                            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                            Clear Session
                </button>
            </div>
            </div>
            </div>
        );
    }

    if (!generatedImage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
                <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Loading design...
                    </div>
            </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-zinc-900">
            <AnnotationEditor
                generatedImage={generatedImage}
                originalCapturedImage={originalCapturedImage}
                onCancel={() => { router.push('/'); }}
                onRevisionComplete={handleRevisionComplete}
                onError={(message) => setErrorMessage(message)}
            />

            {errorMessage && (
                <div className="fixed top-20 right-4 max-w-md rounded-lg bg-red-100 p-4 shadow-lg dark:bg-red-900">
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                Revision Error
                            </p>
                            <div className="mt-1 text-xs text-red-600 dark:text-red-300 whitespace-pre-line">
                                {errorMessage}
                            </div>
                        </div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
            </div>
            )}
        </div>
    );
};

export default EditorPage;


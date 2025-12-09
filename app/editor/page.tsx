'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnnotationEditor } from '../components/AnnotationEditor';
import { GeneratedImage, RevisionNode } from '../types/landscape';
import { Project } from '../types/project';
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
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [isSavingToProject, setIsSavingToProject] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

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

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoadingProjects(true);
            setProjectLoadError(null);
            try {
                const response = await fetch('/api/projects', { cache: 'no-store' });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || 'Unable to load projects');
                }

                const loadedProjects: Project[] = data.projects ?? [];
                setProjects(loadedProjects);
                if (loadedProjects.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(loadedProjects[0].id);
                }
            } catch (err) {
                setProjectLoadError(
                    err instanceof Error ? err.message : 'Unable to load projects',
                );
            } finally {
                setIsLoadingProjects(false);
            }
        };

        fetchProjects();
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

    const handleSaveToProject = useCallback(async () => {
        if (!generatedImage) {
            setSaveErrorMessage('Nothing to save yet.');
            return;
        }

        if (!selectedProjectId) {
            setSaveErrorMessage('Please select a project before saving.');
            return;
        }

        setIsSavingToProject(true);
        setSaveSuccessMessage(null);
        setSaveErrorMessage(null);

        try {
            const response = await fetch(`/api/projects/${selectedProjectId}/designs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    generatedImageBase64: generatedImage.image,
                    generatedMimeType: generatedImage.mimeType,
                    originalImageBase64: originalCapturedImage?.image,
                    originalMimeType: originalCapturedImage?.mimeType,
                    revisionHistory,
                    description: generatedImage.description,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Unable to save design');
            }

            setSaveSuccessMessage('Saved to project and CDN');
        } catch (err) {
            setSaveErrorMessage(
                err instanceof Error ? err.message : 'Unable to save design',
            );
        } finally {
            setIsSavingToProject(false);
        }
    }, [generatedImage, originalCapturedImage, revisionHistory, selectedProjectId]);

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
                            onClick={() => router.push('/map')}
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
            <div className="flex flex-col gap-2 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col">
                        <p className="text-xs uppercase tracking-wide text-green-200">Persistence</p>
                        <p className="text-sm text-white">
                            Save this design to a project and upload images to Cloudflare.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={selectedProjectId}
                            onChange={(event) => setSelectedProjectId(event.target.value)}
                            disabled={isLoadingProjects || projects.length === 0}
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white shadow-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-600/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleSaveToProject}
                            disabled={isSavingToProject || isLoadingProjects || projects.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingToProject ? 'Saving...' : 'Save to project'}
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {projectLoadError && (
                        <span className="text-red-300">
                            {projectLoadError}
                        </span>
                    )}
                    {saveErrorMessage && (
                        <span className="text-red-300">
                            {saveErrorMessage}
                        </span>
                    )}
                    {saveSuccessMessage && (
                        <span className="text-green-300">
                            {saveSuccessMessage}
                        </span>
                    )}
                    {isLoadingProjects && (
                        <span className="text-zinc-200">Loading projects...</span>
                    )}
                </div>
            </div>
            <AnnotationEditor
                generatedImage={generatedImage}
                originalCapturedImage={originalCapturedImage}
                onCancel={() => { router.push('/map'); }}
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


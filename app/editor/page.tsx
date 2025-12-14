'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

import { AnnotationEditor } from '../components/AnnotationEditor';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GeneratedImage, RevisionNode } from '../types/landscape';

type RemoteDesign = {
    id: string;
    generatedImageUrl: string;
    originalImageUrl?: string | null;
    mimeType?: string | null;
    description?: string | null;
    revisionHistory?: RevisionNode[] | null;
    createdAt?: string;
};

const publicImageBaseUrl =
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;

const toPublicImageUrl = (originalUrl?: string | null) => {
    if (!originalUrl) return undefined;
    if (!publicImageBaseUrl) return originalUrl;

    try {
        const parsed = new URL(originalUrl);
        const segments = parsed.pathname.split('/').filter(Boolean);

        if (segments.length === 0) return originalUrl;

        const keyPath = segments[0] === 'projects' ? segments.join('/') : segments.slice(1).join('/') || segments[0];
        const normalizedBase = publicImageBaseUrl.replace(/\/$/, '');

        return `${normalizedBase}/${keyPath}`;
    } catch (error) {
        console.warn('Failed to build public image URL, falling back to original', error);
        return originalUrl;
    }
};

const isHttpUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

const toBase64Payload = (value: string) => {
    if (value.startsWith('data:')) {
        const [, base64Part] = value.split(',', 2);
        return base64Part || '';
    }
    return value;
};

const buildGeneratedImageFromDesign = (design: RemoteDesign): GeneratedImage => ({
    image: toPublicImageUrl(design.generatedImageUrl) || design.generatedImageUrl,
    mimeType: design.mimeType || 'image/png',
    description: design.description ?? undefined,
});

const buildOriginalCapturedImageFromDesign = (design: RemoteDesign): GeneratedImage | null => {
    if (!design.originalImageUrl) return null;
    return {
        image: toPublicImageUrl(design.originalImageUrl) || design.originalImageUrl,
        mimeType: design.mimeType || 'image/png',
        description: 'Original capture',
    };
};

const mapDesignsToEditorState = (designs: RemoteDesign[]) => {
    if (!designs.length) {
        throw new Error('No designs found for this project.');
    }

    const sorted = [...designs].sort((a, b) => {
        const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
        return aTs - bTs;
    });

    const originalDesignWithImage = sorted.find((design) => !!design.originalImageUrl);
    const originalPayload = originalDesignWithImage
        ? buildOriginalCapturedImageFromDesign(originalDesignWithImage)
        : null;

    const revisionHistory = sorted.map((design, index) => {
        const image = toPublicImageUrl(design.generatedImageUrl) || design.generatedImageUrl;
        const timestamp = design.createdAt ? Date.parse(design.createdAt) : Date.now();
        return {
            id: design.id || `rev-${index}`,
            parentId: index === 0 ? null : sorted[index - 1]?.id ?? null,
            image,
            mimeType: design.mimeType || 'image/png',
            annotations: [],
            timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
            label: design.description || `Design ${index + 1}`,
        } satisfies RevisionNode;
    });

    const latestDesign = sorted[sorted.length - 1];
    const generatedPayload = buildGeneratedImageFromDesign(latestDesign);
    const currentRevisionId = revisionHistory[revisionHistory.length - 1]?.id ?? null;

    return {
        generatedPayload,
        originalPayload,
        revisionHistory,
        currentRevisionId,
    };
};

const EditorPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectIdFromQuery = searchParams.get('projectId');
    const [projectId, setProjectId] = useState('');
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
    const [originalCapturedImage, setOriginalCapturedImage] = useState<GeneratedImage | null>(null);
    const [revisionHistory, setRevisionHistory] = useState<RevisionNode[]>([]);
    const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoadingDesign, setIsLoadingDesign] = useState(false);
    const [isSavingToProject, setIsSavingToProject] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!projectIdFromQuery) {
            setLoadError('Missing project. Open a project from the dashboard to continue.');
            setProjectId('');
            return;
        }
        setProjectId(projectIdFromQuery);
    }, [projectIdFromQuery]);

    const loadDesignForProject = useCallback(async (projectId: string) => {
        setIsLoadingDesign(true);
        setLoadError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/designs`, { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Unable to load designs for this project');
            }

            const designs: RemoteDesign[] = data.designs ?? [];
            const { generatedPayload, originalPayload, revisionHistory: mappedHistory, currentRevisionId } =
                mapDesignsToEditorState(designs);

            setGeneratedImage(generatedPayload);
            setOriginalCapturedImage(originalPayload);
            setRevisionHistory(mappedHistory);
            setCurrentRevisionId(currentRevisionId);
        } catch (err) {
            setGeneratedImage(null);
            setOriginalCapturedImage(null);
            setRevisionHistory([]);
            setCurrentRevisionId(null);
            setLoadError(err instanceof Error ? err.message : 'Unable to load design');
        } finally {
            setIsLoadingDesign(false);
        }
    }, []);

    useEffect(() => {
        if (!projectId) {
            return;
        }
        loadDesignForProject(projectId);
    }, [projectId, loadDesignForProject]);

    const autoSaveDesign = useCallback(async (overrides?: {
        generatedImage?: GeneratedImage;
        revisionHistory?: RevisionNode[];
        currentRevisionId?: string | null;
        projectId?: string | null;
    }) => {
        if (isSavingToProject) return;

        const targetProjectId = overrides?.projectId ?? projectId;
        const imagePayload = overrides?.generatedImage ?? generatedImage;
        const revisionPayload = overrides?.revisionHistory ?? revisionHistory;

        if (!targetProjectId) {
            return;
        }

        if (!imagePayload) {
            setSaveErrorMessage('Nothing to save yet.');
            return;
        }

        if (isHttpUrl(imagePayload.image)) {
            setSaveErrorMessage('This design is already stored on the CDN. Make edits to create a new revision before saving.');
            return;
        }

        const generatedImageBase64 = toBase64Payload(imagePayload.image);
        const originalImageBase64 = originalCapturedImage && !isHttpUrl(originalCapturedImage.image)
            ? toBase64Payload(originalCapturedImage.image)
            : undefined;

        setIsSavingToProject(true);
        setSaveSuccessMessage(null);
        setSaveErrorMessage(null);

        try {
            const response = await fetch(`/api/projects/${targetProjectId}/designs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    generatedImageBase64,
                    generatedMimeType: imagePayload.mimeType,
                    originalImageBase64,
                    originalMimeType: originalImageBase64 ? originalCapturedImage?.mimeType : undefined,
                    revisionHistory: revisionPayload,
                    description: imagePayload.description,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Unable to save design');
            }

            setSaveSuccessMessage('Progress saved to project and CDN');
        } catch (err) {
            setSaveErrorMessage(
                err instanceof Error ? err.message : 'Unable to save design',
            );
        } finally {
            setIsSavingToProject(false);
        }
    }, [projectId, generatedImage, originalCapturedImage, revisionHistory, isSavingToProject]);

    const handleRevisionComplete = useCallback(async (data: {
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

        const nextGeneratedImage = {
            image: data.image,
            mimeType: data.mimeType,
            description: data.description,
        };

        await autoSaveDesign({
            generatedImage: nextGeneratedImage,
            revisionHistory: updatedHistory,
            currentRevisionId: newRevisionId,
        });
    }, [currentRevisionId, revisionHistory, autoSaveDesign]);

    const handleRetryLoad = useCallback(() => {
        if (projectId) {
            loadDesignForProject(projectId);
            return;
        }
        router.push('/dashboard');
    }, [loadDesignForProject, projectId, router]);


    const handleSaveToProject = useCallback(async () => {
        if (!projectId) {
            setSaveErrorMessage('Missing project context.');
            return;
        }
        await autoSaveDesign();
    }, [projectId, autoSaveDesign]);

    if (loadError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="rounded-lg bg-card p-8 shadow-lg">
                    <h2 className="mb-3 text-xl font-semibold text-card-foreground">
                        Nothing to Annotate
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {loadError}
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={() => router.push('/dashboard')}>
                            Go to dashboard
                        </Button>
                        <Button variant="outline" onClick={handleRetryLoad}>
                            Try again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingDesign || !generatedImage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="rounded-lg bg-card p-8 shadow-lg">
                    <div className="text-sm text-muted-foreground">
                        {isLoadingDesign ? 'Loading design...' : 'No design available yet.'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-background">
            <div className="flex flex-col gap-2 border-b border-border bg-card/40 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <p className="text-xs uppercase tracking-wide text-primary">Persistence</p>
                        <p className="text-sm text-card-foreground">
                            Saving annotations for project {projectId || '(select a project from dashboard)'}.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={handleSaveToProject}
                        disabled={isSavingToProject || !projectId}
                    >
                        {isSavingToProject ? 'Saving...' : 'Save to project'}
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {saveErrorMessage && (
                        <Alert variant="destructive" className="py-2">
                            <AlertDescription>{saveErrorMessage}</AlertDescription>
                        </Alert>
                    )}
                    {saveSuccessMessage && (
                        <Alert className="py-2">
                            <AlertDescription>{saveSuccessMessage}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
            <AnnotationEditor
                generatedImage={generatedImage}
                originalCapturedImage={originalCapturedImage}
                onCancel={() => { router.push('/dashboard'); }}
                onRevisionComplete={handleRevisionComplete}
                onError={(message) => setErrorMessage(message)}
            />

            {errorMessage && (
                <Alert variant="destructive" className="fixed top-20 right-4 max-w-md shadow-lg">
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <AlertTitle>Revision Error</AlertTitle>
                            <AlertDescription className="mt-1 whitespace-pre-line">
                                {errorMessage}
                            </AlertDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setErrorMessage(null)}
                            className="text-destructive hover:text-destructive"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </Alert>
            )}
        </div>
    );
};

export default EditorPage;


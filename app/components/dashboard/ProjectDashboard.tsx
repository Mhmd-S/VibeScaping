'use client';

import { ImageIcon, Loader2, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardFooter, CardHeader } from '@/app/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { Project } from '@/app/types/project';

interface ProjectDashboardProps {
    initialProjects: Project[];
    userName?: string;
}

const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const buildPlaceholderName = () => {
    const now = new Date();
    const formatted = now.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return `Landscape Project ${formatted}`;
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

        // Keep leading "projects" prefix; otherwise drop only a bucket segment
        const keyPath = segments[0] === 'projects' ? segments.join('/') : segments.slice(1).join('/') || segments[0];
        const normalizedBase = publicImageBaseUrl.replace(/\/$/, '');

        return `${normalizedBase}/${keyPath}`;
    } catch (error) {
        console.warn('Failed to build public image URL, falling back to original', error);
        return originalUrl;
    }
};

const ProjectDashboard = ({ initialProjects }: ProjectDashboardProps) => {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [savingRename, setSavingRename] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
    const renameInputRef = useRef<HTMLInputElement | null>(null);

    const hasProjects = useMemo(() => projects.length > 0, [projects]);

    const refreshProjects = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await fetch('/api/projects', { cache: 'no-store' });
            const body = await response.json();

            if (!response.ok) {
                throw new Error(body?.error || 'Unable to load projects');
            }

            setProjects(body.projects ?? []);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Unable to load projects');
        } finally {
            setIsRefreshing(false);
        }
    };

    const createAndGoToMap = async () => {
        if (isCreating) return;

        setIsCreating(true);
        setError(null);

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: buildPlaceholderName(), description: '' }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not create project');
            }

            setProjects((current) => [result.project, ...current]);
            router.push(`/map?projectId=${result.project.id}`);
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not create project');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenProject = (projectId: string) => {
        router.push(`/editor?projectId=${projectId}`);
    };

    const beginRename = (project: Project) => {
        setError(null);
        setRenamingId(project.id);
        setRenameValue(project.name);
    };

    const cancelRename = () => {
        setRenamingId(null);
        setRenameValue('');
    };

    const handleRename = async (projectId: string) => {
        if (!renameValue.trim()) {
            setError('Project name cannot be empty');
            return;
        }

        setSavingRename(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: renameValue.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not rename project');
            }

            setProjects((current) =>
                current.map((project) =>
                    project.id === projectId
                        ? {
                              ...project,
                              name: result.project.name,
                              updatedAt: result.project.updatedAt,
                          }
                        : project,
                ),
            );
            cancelRename();
        } catch (renameError) {
            setError(renameError instanceof Error ? renameError.message : 'Could not rename project');
        } finally {
            setSavingRename(false);
        }
    };

    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingId]);

    const handleDelete = async () => {
        if (!pendingDelete || deletingId) return;

        const { id: projectId } = pendingDelete;

        setDeletingId(projectId);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(result?.error || 'Could not delete project');
            }

            setProjects((current) => current.filter((project) => project.id !== projectId));

            if (renamingId === projectId) {
                cancelRename();
            }

            setPendingDelete(null);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Could not delete project');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="w-full space-y-8" id="projects">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-linear-to-r from-green-50 via-white to-emerald-50 p-8 shadow-sm">
                <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl">
                    <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-green-300/40" />
                    <div className="absolute right-10 top-10 h-32 w-32 rounded-full bg-emerald-300/30" />
                </div>
                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-green-700">Let's get your design started</p>
                        <h2 className="text-3xl font-bold text-zinc-900">What are you designing today?</h2>
                        <p className="text-base text-zinc-600">
                            Kick off a new landscape concept or jump back into your saved projects.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={createAndGoToMap}
                            disabled={isCreating}
                            className="group flex items-center gap-2 rounded-full bg-linear-to-r from-green-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-200 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </span>
                            {isCreating ? 'Creating...' : 'New Project'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/50 dark:text-red-200">
                    {error}
                </div>
            )}

            <div className="space-y-4" id="project-list">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-900">My projects</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Projects you've created are listed below.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                        </span>
                        <button
                            type="button"
                            onClick={refreshProjects}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-green-500 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRefreshing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="h-4 w-4" />
                            )}
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {!hasProjects ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-600 shadow-sm dark:border-zinc-700 ">
                        No projects yet. Start a new project to save your work.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => {
                            const latestDesignUrl = toPublicImageUrl(project.lastDesign?.generatedImageUrl);
                            const hasPreview = latestDesignUrl && !imageErrors[project.id];
                            const projectUpdated = formatDate(project.updatedAt);
                            const isRenaming = renamingId === project.id;
                            const isDeleting = deletingId === project.id;
                            const isSavingThisRename = isRenaming && savingRename;

                            return (
                                <Card
                                    key={project.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleOpenProject(project.id)}
                                    onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleOpenProject(project.id);
                                        }
                                    }}
                                    className="group relative flex h-full cursor-pointer flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-green-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                >
                                    <button
                                        type="button"
                                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                            setPendingDelete({ id: project.id, name: project.name });
                                        }}
                                        disabled={isDeleting}
                                        className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white/90 text-red-600 shadow-sm backdrop-blur transition hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                    <CardHeader className="p-0">
                                        <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
                                            {hasPreview ? (
                                                <Image
                                                    src={latestDesignUrl}
                                                    alt={`Latest design for ${project.name}`}
                                                    fill
                                                    unoptimized
                                                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                                                    className="rounded-lg object-cover transition duration-300 group-hover:scale-105"
                                                    onError={() => setImageErrors((prev) => ({ ...prev, [project.id]: true }))}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-b border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
                                                    <ImageIcon className="h-6 w-6 text-zinc-400" />
                                                    <span>No preview yet</span>
                                                </div>
                                            )}
                                            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-90" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col gap-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            {isRenaming ? (
                                                <input
                                                    ref={renameInputRef}
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                        setRenameValue(event.target.value)
                                                    }
                                                    onClick={(event: MouseEvent<HTMLInputElement>) => event.stopPropagation()}
                                                    onBlur={() => handleRename(project.id)}
                                                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                                                        event.stopPropagation();
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            handleRename(project.id);
                                                        }
                                                        if (event.key === 'Escape') {
                                                            event.preventDefault();
                                                            cancelRename();
                                                        }
                                                    }}
                                                    disabled={isSavingThisRename}
                                                    className="min-w-0 flex-1 border-b border-zinc-200 bg-transparent text-base font-semibold text-zinc-900 outline-none focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                                                    placeholder="Project name"
                                                />
                                            ) : (
                                                <div className="flex flex-1 items-start gap-2">
                                                    <p className="line-clamp-2 text-base font-semibold text-zinc-900">{project.name}</p>
                                                    <button
                                                        type="button"
                                                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                                            event.stopPropagation();
                                                            beginRename(project);
                                                        }}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:border-green-500 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                            {isSavingThisRename && <Loader2 className="h-4 w-4 animate-spin text-green-600" />}
                                        </div>
                                        {project.description && (
                                            <p className="text-sm text-zinc-600 line-clamp-2">{project.description}</p>
                                        )}
                                        {project.lastDesign?.description && (
                                            <p className="text-xs text-zinc-500 line-clamp-2">
                                                Last design: {project.lastDesign.description}
                                            </p>
                                        )}
                                        <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
                                            <span>Updated {projectUpdated}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
            <Dialog
                open={Boolean(pendingDelete)}
                onOpenChange={(isOpen) => {
                    if (!isOpen && !deletingId) {
                        setPendingDelete(null);
                    }
                }}
            >
                <DialogContent className="max-w-md border border-green-100 bg-white shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-zinc-900">Delete project</DialogTitle>
                        <DialogDescription className="text-sm text-zinc-600">
                            Are you sure you want to delete '{pendingDelete?.name ?? 'this project'}'? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row justify-end gap-2">
                        <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
                            onClick={() => setPendingDelete(null)}
                            disabled={Boolean(deletingId)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-linear-to-r from-green-600 to-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                            onClick={handleDelete}
                            disabled={Boolean(deletingId)}
                        >
                            {deletingId === pendingDelete?.id ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deleting...
                                </span>
                            ) : (
                                'Delete'
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectDashboard;


'use client';

import { Folder, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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

const rememberActiveProject = (projectId: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('active-project-id', projectId);
};

const ProjectDashboard = ({ initialProjects }: ProjectDashboardProps) => {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
            rememberActiveProject(result.project.id);
            router.push(`/map?projectId=${result.project.id}`);
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not create project');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenProject = (projectId: string) => {
        rememberActiveProject(projectId);
        router.push(`/editor?projectId=${projectId}`);
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
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">My projects</h3>
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
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        No projects yet. Start a new project to save your work.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => {
                            const latestDesignUrl = project.lastDesign?.generatedImageUrl;
                            const projectUpdated = formatDate(project.updatedAt);

                            return (
                                <div
                                    key={project.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleOpenProject(project.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleOpenProject(project.id);
                                        }
                                    }}
                                    className="group flex h-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-green-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                >
                                    {latestDesignUrl ? (
                                        <div className="relative h-44 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900">
                                            <img
                                                src={latestDesignUrl}
                                                alt={`Latest design for ${project.name}`}
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                                            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-white">
                                                <span className="rounded-full bg-white/15 px-2 py-1 font-semibold">
                                                    Latest design
                                                </span>
                                                <span className="text-white/80">Updated {projectUpdated}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 shadow-inner dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                                            No designs yet. Click to start in the editor.
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                <Folder className="h-4 w-4" />
                                                Updated {projectUpdated}
                                            </div>
                                            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                                                {project.name}
                                            </p>
                                            {project.description && (
                                                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                                    {project.description}
                                                </p>
                                            )}
                                            {project.lastDesign?.description && (
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                                    Last design: {project.lastDesign.description}
                                                </p>
                                            )}
                                        </div>
                                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                            Continue in editor
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDashboard;


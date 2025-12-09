'use client';

import { Folder, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Project } from '@/app/types/project';

interface ProjectDashboardProps {
    initialProjects: Project[];
    userName: string;
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

const ProjectDashboard = ({ initialProjects, userName }: ProjectDashboardProps) => {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreatePanel, setShowCreatePanel] = useState(false);

    const hasProjects = useMemo(() => projects.length > 0, [projects]);

    const refreshProjects = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await fetch('/api/projects');
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

    const handleCreateOpen = () => {
        setError(null);
        setShowCreatePanel(true);
    };

    const handleCreateClose = () => {
        if (isCreating) return;
        setName('');
        setDescription('');
        setError(null);
        setShowCreatePanel(false);
    };

    const handleCreateProject = async () => {
        if (!name.trim()) {
            setError('Please provide a project name.');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not create project');
            }

            setProjects((current) => [result.project, ...current]);
            setName('');
            setDescription('');
            setShowCreatePanel(false);
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not create project');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="w-full space-y-8" id="projects">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-r from-green-50 via-white to-emerald-50 p-8 shadow-sm">
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
                            onClick={handleCreateOpen}
                            disabled={isCreating}
                            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-200 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </span>
                            New Project
                        </button>
                    </div>
                </div>
            </div>

            {showCreatePanel && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Start a project</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Give your project a name and optional description.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateClose}
                            disabled={isCreating}
                            className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                            Cancel
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/50 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Project name</label>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Backyard redesign"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                                maxLength={120}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                Description (optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Notes about style, scope, or next steps."
                                className="min-h-[96px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                                maxLength={500}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleCreateProject}
                            disabled={isCreating}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {isCreating ? 'Creating...' : 'Create project'}
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateClose}
                            disabled={isCreating}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-zinc-50"
                        >
                            Cancel
                        </button>
                    </div>
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
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-green-500 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            <Folder className="h-4 w-4" />
                                            Updated {formatDate(project.updatedAt)}
                                        </div>
                                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                                            {project.name}
                                        </p>
                                        {project.description && (
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{project.description}</p>
                                        )}
                                    </div>
                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                        Map ready
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDashboard;


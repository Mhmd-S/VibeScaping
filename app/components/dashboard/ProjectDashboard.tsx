'use client';

import { useMemo, useState } from 'react';

import { Project } from '@/app/types/project';
import { signOut } from 'next-auth/react';

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
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not create project');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Signed in as
                    </p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {userName}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={refreshProjects}
                        disabled={isRefreshing}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-blue-400 dark:hover:text-blue-300"
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh list'}
                    </button>
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
                    >
                        Sign out
                    </button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Create a project
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Track map generations and annotations under a named project.
                    </p>

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/50 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    <div className="mt-4 space-y-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                Project name
                            </label>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Backyard redesign"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                                maxLength={120}
                            />
                        </div>

                        <div className="space-y-1">
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

                        <button
                            type="button"
                            onClick={handleCreateProject}
                            disabled={isCreating}
                            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            {isCreating ? 'Creating...' : 'Create project'}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Your projects
                        </h2>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                        </span>
                    </div>

                    {!hasProjects ? (
                        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                            No projects yet. Create your first project to save your work.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-400"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                                                {project.name}
                                            </p>
                                            {project.description && (
                                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                                    {project.description}
                                                </p>
                                            )}
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Updated {formatDate(project.updatedAt)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-2">
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                                Map ready
                                            </span>
                                            <button
                                                type="button"
                                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-blue-400 dark:hover:text-blue-300"
                                                onClick={() => refreshProjects()}
                                            >
                                                Sync
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboard;


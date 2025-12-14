'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Project } from '@/app/types/project';
import { ProjectHeader } from './ProjectHeader';
import { ProjectCard } from './ProjectCard';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { buildPlaceholderName } from './projectUtils';

interface ProjectDashboardProps {
    initialProjects: Project[];
    userName?: string;
}

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
            // Navigate to map page - project will be created after successful image generation
            router.push('/map');
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not navigate to map');
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
            <ProjectHeader isCreating={isCreating} onCreateProject={createAndGoToMap} />

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4" id="project-list">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-card-foreground">My projects</h3>
                        <p className="text-sm text-muted-foreground">
                            Projects you've created are listed below.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-card-foreground">
                            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                        </span>
                    </div>
                </div>

                {!hasProjects ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
                        No projects yet. Start a new project to save your work.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 pb-8">
                        {projects.map((project) => {
                            const isRenaming = renamingId === project.id;
                            const isDeleting = deletingId === project.id;
                            const isSavingThisRename = isRenaming && savingRename;

                            return (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    isRenaming={isRenaming}
                                    isDeleting={isDeleting}
                                    isSavingRename={isSavingThisRename}
                                    renameValue={renameValue}
                                    hasImageError={imageErrors[project.id] || false}
                                    onOpen={handleOpenProject}
                                    onDelete={(p) => setPendingDelete({ id: p.id, name: p.name })}
                                    onBeginRename={beginRename}
                                    onCancelRename={cancelRename}
                                    onRename={handleRename}
                                    onRenameValueChange={setRenameValue}
                                    onImageError={(projectId) =>
                                        setImageErrors((prev) => ({ ...prev, [projectId]: true }))
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </div>
            <DeleteProjectDialog
                isOpen={Boolean(pendingDelete)}
                projectName={pendingDelete?.name ?? null}
                isDeleting={Boolean(deletingId)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default ProjectDashboard;


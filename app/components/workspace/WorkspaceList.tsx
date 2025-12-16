'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Workspace } from '@/app/types/workspace';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceCard } from './WorkspaceCard';
import { DeleteProjectDialog } from '../dashboard/DeleteProjectDialog'; // Reusing component, name is fine
import { buildPlaceholderName } from './workspaceUtils';

interface WorkspaceListProps {
    initialWorkspaces: Workspace[];
    userName?: string;
}

const WorkspaceList = ({ initialWorkspaces }: WorkspaceListProps) => {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [savingRename, setSavingRename] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

    const hasWorkspaces = useMemo(() => workspaces.length > 0, [workspaces]);

    const refreshWorkspaces = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await fetch('/api/workspaces', { cache: 'no-store' });
            const body = await response.json();

            if (!response.ok) {
                throw new Error(body?.error || 'Unable to load workspaces');
            }

            setWorkspaces(body.workspaces ?? []);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Unable to load workspaces');
        } finally {
            setIsRefreshing(false);
        }
    };

    const createAndGoToEditor = async () => {
        if (isCreating) return;

        setIsCreating(true);
        setError(null);

        try {
            const name = buildPlaceholderName();
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not create workspace');
            }

            router.push(`/editor?workspaceId=${result.workspace.id}`);
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not create workspace');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenWorkspace = (workspaceId: string) => {
        router.push(`/editor?workspaceId=${workspaceId}`);
    };

    const beginRename = (workspace: Workspace) => {
        setError(null);
        setRenamingId(workspace.id);
        setRenameValue(workspace.name);
    };

    const cancelRename = () => {
        setRenamingId(null);
        setRenameValue('');
    };

    const handleRename = async (workspaceId: string) => {
        if (!renameValue.trim()) {
            setError('Workspace name cannot be empty');
            return;
        }

        setSavingRename(true);
        setError(null);

        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: renameValue.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not rename workspace');
            }

            setWorkspaces((current) =>
                current.map((workspace) =>
                    workspace.id === workspaceId
                        ? {
                              ...workspace,
                              name: result.workspace.name,
                              updatedAt: result.workspace.updatedAt,
                          }
                        : workspace,
                ),
            );
            cancelRename();
        } catch (renameError) {
            setError(renameError instanceof Error ? renameError.message : 'Could not rename workspace');
        } finally {
            setSavingRename(false);
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete || deletingId) return;

        const { id: workspaceId } = pendingDelete;

        setDeletingId(workspaceId);
        setError(null);

        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(result?.error || 'Could not delete workspace');
            }

            setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));

            if (renamingId === workspaceId) {
                cancelRename();
            }

            setPendingDelete(null);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Could not delete workspace');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="w-full space-y-8" id="workspaces">
            <WorkspaceHeader isCreating={isCreating} onCreateWorkspace={createAndGoToEditor} />

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4" id="workspace-list">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-card-foreground">My workspaces</h3>
                        <p className="text-sm text-muted-foreground">
                            Workspaces you've created are listed below.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-card-foreground">
                            {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
                        </span>
                    </div>
                </div>

                {!hasWorkspaces ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
                        No workspaces yet. Start a new workspace to save your work.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 pb-8">
                        {workspaces.map((workspace) => {
                            const isRenaming = renamingId === workspace.id;
                            const isDeleting = deletingId === workspace.id;
                            const isSavingThisRename = isRenaming && savingRename;

                            return (
                                <WorkspaceCard
                                    key={workspace.id}
                                    workspace={workspace}
                                    isRenaming={isRenaming}
                                    isDeleting={isDeleting}
                                    isSavingRename={isSavingThisRename}
                                    renameValue={renameValue}
                                    hasImageError={imageErrors[workspace.id] || false}
                                    onOpen={handleOpenWorkspace}
                                    onDelete={(w) => setPendingDelete({ id: w.id, name: w.name })}
                                    onBeginRename={beginRename}
                                    onCancelRename={cancelRename}
                                    onRename={handleRename}
                                    onRenameValueChange={setRenameValue}
                                    onImageError={(workspaceId) =>
                                        setImageErrors((prev) => ({ ...prev, [workspaceId]: true }))
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

export default WorkspaceList;


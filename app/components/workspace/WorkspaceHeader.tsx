'use client';

import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface WorkspaceHeaderProps {
    isCreating: boolean;
    onCreateWorkspace: () => void;
}

export const WorkspaceHeader = ({ isCreating, onCreateWorkspace }: WorkspaceHeaderProps) => {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl">
                <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-primary/40" />
                <div className="absolute right-10 top-10 h-32 w-32 rounded-full bg-primary/30" />
            </div>
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-primary">Get started</p>
                    <h2 className="text-3xl font-bold text-card-foreground">Your Workspaces</h2>
                    <p className="text-base text-muted-foreground">
                        Create a new workspace to start annotating images or continue working on existing ones.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={onCreateWorkspace}
                        disabled={isCreating}
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full ">
                            {isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                        </span>
                        {isCreating ? 'Creating...' : 'New Workspace'}
                    </Button>
                </div>
            </div>
        </div>
    );
};


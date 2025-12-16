'use client';

import { ImageIcon, Loader2, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, KeyboardEvent, MouseEvent, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Workspace } from '@/app/types/workspace';
import { formatDate, toPublicImageUrl } from './workspaceUtils';

interface WorkspaceCardProps {
    workspace: Workspace;
    isRenaming: boolean;
    isDeleting: boolean;
    isSavingRename: boolean;
    renameValue: string;
    hasImageError: boolean;
    onOpen: (workspaceId: string) => void;
    onDelete: (workspace: Workspace) => void;
    onBeginRename: (workspace: Workspace) => void;
    onCancelRename: () => void;
    onRename: (workspaceId: string) => void;
    onRenameValueChange: (value: string) => void;
    onImageError: (workspaceId: string) => void;
}

export const WorkspaceCard = ({
    workspace,
    isRenaming,
    isDeleting,
    isSavingRename,
    renameValue,
    hasImageError,
    onOpen,
    onDelete,
    onBeginRename,
    onCancelRename,
    onRename,
    onRenameValueChange,
    onImageError,
}: WorkspaceCardProps) => {
    const renameInputRef = useRef<HTMLInputElement | null>(null);
    const latestImageUrl = toPublicImageUrl(workspace.lastAnnotatedImage?.generatedImageUrl);
    const hasPreview = latestImageUrl && !hasImageError;
    const workspaceUpdated = formatDate(workspace.updatedAt);

    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenaming]);

    return (
        <Card
            role="button"
            className="group relative py-0"
            tabIndex={0}
            onClick={() => onOpen(workspace.id)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(workspace.id);
                }
            }}
        >
            <button
                type="button"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    onDelete(workspace);
                }}
                disabled={isDeleting}
                className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-destructive/20 bg-card/90 text-destructive shadow-sm backdrop-blur transition hover:border-destructive/40 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <CardHeader className="p-0">
                <div className="relative h-48 w-full overflow-hidden p-0 rounded-t-2xl">
                    {hasPreview ? (
                        <Image
                            src={latestImageUrl}
                            alt={`Latest image for ${workspace.name}`}
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="rounded-lg object-cover transition duration-300 group-hover:scale-105"
                            onError={() => onImageError(workspace.id)}
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-b border-dashed border-border bg-muted text-sm text-muted-foreground">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            <span>No preview yet</span>
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-90" />
                </div>
            </CardHeader>
            <CardContent className="pb-8">
                <div className="flex items-start justify-between gap-3">
                    {isRenaming ? (
                        <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                onRenameValueChange(event.target.value)
                            }
                            onClick={(event: MouseEvent<HTMLInputElement>) => event.stopPropagation()}
                            onBlur={() => onRename(workspace.id)}
                            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                                event.stopPropagation();
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    onRename(workspace.id);
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    onCancelRename();
                                }
                            }}
                            disabled={isSavingRename}
                            className="min-w-0 flex-1 border-b border-border bg-transparent text-base font-semibold text-card-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                            placeholder="Workspace name"
                        />
                    ) : (
                        <div className="flex flex-1 items-start gap-2">
                            <p className="line-clamp-2 text-base font-semibold text-card-foreground">{workspace.name}</p>
                            <button
                                type="button"
                                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                    event.stopPropagation();
                                    onBeginRename(workspace);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                    {isSavingRename && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                {workspace.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{workspace.description}</p>
                )}
                {workspace.lastAnnotatedImage?.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        Last image: {workspace.lastAnnotatedImage.description}
                    </p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated {workspaceUpdated}</span>
                </div>
            </CardContent>
        </Card>
    );
};


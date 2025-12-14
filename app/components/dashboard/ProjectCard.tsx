'use client';

import { ImageIcon, Loader2, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, KeyboardEvent, MouseEvent, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Project } from '@/app/types/project';
import { formatDate, toPublicImageUrl } from './projectUtils';

interface ProjectCardProps {
    project: Project;
    isRenaming: boolean;
    isDeleting: boolean;
    isSavingRename: boolean;
    renameValue: string;
    hasImageError: boolean;
    onOpen: (projectId: string) => void;
    onDelete: (project: Project) => void;
    onBeginRename: (project: Project) => void;
    onCancelRename: () => void;
    onRename: (projectId: string) => void;
    onRenameValueChange: (value: string) => void;
    onImageError: (projectId: string) => void;
}

export const ProjectCard = ({
    project,
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
}: ProjectCardProps) => {
    const renameInputRef = useRef<HTMLInputElement | null>(null);
    const latestDesignUrl = toPublicImageUrl(project.lastDesign?.generatedImageUrl);
    const hasPreview = latestDesignUrl && !hasImageError;
    const projectUpdated = formatDate(project.updatedAt);

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
            onClick={() => onOpen(project.id)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(project.id);
                }
            }}
        >
            <button
                type="button"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    onDelete(project);
                }}
                disabled={isDeleting}
                className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-destructive/20 bg-card/90 text-destructive shadow-sm backdrop-blur transition hover:border-destructive/40 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <CardHeader className="p-0">
                <div className="relative h-48 w-full overflow-hidden bg-muted p-0">
                    {hasPreview ? (
                        <Image
                            src={latestDesignUrl}
                            alt={`Latest design for ${project.name}`}
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="rounded-lg object-cover transition duration-300 group-hover:scale-105"
                            onError={() => onImageError(project.id)}
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
                            onBlur={() => onRename(project.id)}
                            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                                event.stopPropagation();
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    onRename(project.id);
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    onCancelRename();
                                }
                            }}
                            disabled={isSavingRename}
                            className="min-w-0 flex-1 border-b border-border bg-transparent text-base font-semibold text-card-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                            placeholder="Project name"
                        />
                    ) : (
                        <div className="flex flex-1 items-start gap-2">
                            <p className="line-clamp-2 text-base font-semibold text-card-foreground">{project.name}</p>
                            <button
                                type="button"
                                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                    event.stopPropagation();
                                    onBeginRename(project);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                    {isSavingRename && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                {project.lastDesign?.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        Last design: {project.lastDesign.description}
                    </p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated {projectUpdated}</span>
                </div>
            </CardContent>
        </Card>
    );
};


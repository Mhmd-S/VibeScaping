'use client';

import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';

interface DeleteProjectDialogProps {
    isOpen: boolean;
    projectName: string | null;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteProjectDialog = ({
    isOpen,
    projectName,
    isDeleting,
    onClose,
    onConfirm,
}: DeleteProjectDialogProps) => {
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open && !isDeleting) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-w-md border border-border bg-card shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-card-foreground">Delete project</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Are you sure you want to delete '{projectName ?? 'this project'}'? This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


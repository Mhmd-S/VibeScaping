import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteProjectProps {
    open: boolean;
    onClose: () => void;
    onDelete: () => void;
}

export const DeleteProject = ({ open, onClose, onDelete }: DeleteProjectProps) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this project? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={onDelete}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
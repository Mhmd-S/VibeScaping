'use client';

import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

const ChatError = ({ error, reset }: ErrorProps) => {
    useEffect(() => {
        console.error('Chat error:', error);
        toast.error(error.message || 'An unexpected error occurred in the chat interface.');
    }, [error]);

    return (
        <div className="flex h-full items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription className="mt-2">
                    {error.message || 'An unexpected error occurred in the chat interface.'}
                </AlertDescription>
                <Button
                    variant="outline"
                    onClick={reset}
                    className="mt-4"
                >
                    Try again
                </Button>
            </Alert>
        </div>
    );
};

export default ChatError;










'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SettingsPage = () => {
    const router = useRouter();
    const [apiKey, setApiKey] = useState('');
    const [maskedApiKey, setMaskedApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadApiKey();
    }, []);

    const loadApiKey = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/settings/api-key');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load API key');
            }

            if (data.hasKey) {
                setMaskedApiKey(data.apiKey);
                setHasExistingKey(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load API key');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setError('API key is required');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/settings/api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save API key');
            }

            setSuccess('API key saved successfully');
            setApiKey('');
            await loadApiKey();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete your API key?')) {
            return;
        }

        setIsDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/settings/api-key', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete API key');
            }

            setSuccess('API key deleted successfully');
            setHasExistingKey(false);
            setMaskedApiKey('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete API key');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold text-card-foreground">Settings</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage your Gemini API key for chat and image generation
                </p>
            </div>

            <div className="space-y-6">
                <div className="rounded-lg border border-border bg-card p-6">
                    <h2 className="mb-4 text-lg font-semibold text-card-foreground">
                        Gemini API Key
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Your API key is encrypted and stored securely. It will be used for chat
                        conversations and image generation.
                    </p>

                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : hasExistingKey ? (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="masked-key">Current API Key</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    <Input
                                        id="masked-key"
                                        type="text"
                                        value={showApiKey ? maskedApiKey : maskedApiKey.replace(/./g, '*')}
                                        readOnly
                                        className="font-mono"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {isDeleting ? 'Deleting...' : 'Delete API Key'}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-4">
                        <Label htmlFor="api-key">
                            {hasExistingKey ? 'Update API Key' : 'Enter API Key'}
                        </Label>
                        <Input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your Gemini API key"
                            className="mt-2 font-mono"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                            Get your API key from{' '}
                            <a
                                href="https://makersuite.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>

                    <div className="mt-4">
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || !apiKey.trim()}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving...' : hasExistingKey ? 'Update API Key' : 'Save API Key'}
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;


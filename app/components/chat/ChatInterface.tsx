'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Loader2,
    Settings,
    ArrowUp,
    Camera,
    CirclePlus,
    Clipboard,
    Upload,
    History,
    LayoutDashboard,
    Link,
    Paperclip,
    Play,
    Plus,
    Sparkles,
    FileText,
    X,
} from 'lucide-react';
import Image from 'next/image';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AttachedFile {
    id: string;
    name: string;
    file: File;
    preview?: string;
}

const ACTIONS = [
    { id: 'create-workspace', icon: LayoutDashboard, label: 'Create Workspace' },
    { id: 'how-to-annotate', icon: FileText, label: 'How to Annotate' },
    { id: 'upload-image', icon: Upload, label: 'Upload Image' },
    { id: 'take-screenshot', icon: Camera, label: 'Take Screenshot' },
];

const ChatInterface = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [settings, setSettings] = useState({
        autoComplete: true,
        streaming: false,
        showHistory: false,
    });
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const generateFileId = () => Math.random().toString(36).substring(7);

    const processFiles = (files: File[]) => {
        for (const file of files) {
            const fileId = generateFileId();
            const attachedFile: AttachedFile = {
                id: fileId,
                name: file.name,
                file,
            };

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    setAttachedFiles((prev) =>
                        prev.map((f) =>
                            f.id === fileId ? { ...f, preview: reader.result as string } : f
                        )
                    );
                };
                reader.readAsDataURL(file);
            }

            setAttachedFiles((prev) => [...prev, attachedFile]);
        }
    };

    const handleRemoveFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processFiles(files);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            processFiles(files);
        }
    };

    const updateSetting = (key: keyof typeof settings, value: boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const submitPrompt = async () => {
        if (!prompt.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: prompt.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = prompt.trim();
        setPrompt('');
        setIsLoading(true);
        setError(null);

        // Check if user wants to create a workspace
        if (currentInput.toLowerCase().includes('create workspace') || 
            currentInput.toLowerCase().includes('new workspace')) {
            try {
                const nameMatch = currentInput.match(/name[:\s]+(.+?)(?:\s|$)/i);
                const name = nameMatch ? nameMatch[1].trim() : `Workspace ${new Date().toLocaleString()}`;
                
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
                
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: `I've created a new workspace called "${name}". You can open it from the left sidebar to start annotating images.`,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
                const errorMsg: Message = {
                    role: 'assistant',
                    content: `Error: ${errorMessage}`,
                };
                setMessages((prev) => [...prev, errorMsg]);
            } finally {
                setIsLoading(false);
                return;
            }
        }

        // Regular chat with Gemini
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: currentInput,
                    history: messages.map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    })),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || 'Failed to get response');
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.message,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
            setError(errorMessage);
            const errorMsg: Message = {
                role: 'assistant',
                content: `Error: ${errorMessage}`,
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitPrompt();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitPrompt();
    };

    return (
        <div className="flex flex-1 flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center space-y-4 max-w-2xl mx-auto">
                            <h1 className="text-pretty text-center font-heading font-semibold text-[29px] text-foreground tracking-tighter sm:text-[32px] md:text-[46px]">
                                Welcome to Annotation Tool
                            </h1>
                            <h2 className="-my-5 pb-4 text-center text-xl text-muted-foreground">
                                Chat with Gemini Pro to get help, create workspaces, or ask questions about your annotations.
                            </h2>
                            <div className="max-w-250 mx-auto flex-wrap gap-3 flex min-h-0 shrink-0 items-center justify-center mt-6">
                                {ACTIONS.map((action) => (
                                    <Button
                                        className="gap-2 rounded-full"
                                        key={action.id}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (action.id === 'create-workspace') {
                                                setPrompt('Create a new workspace');
                                            } else if (action.id === 'how-to-annotate') {
                                                setPrompt('How do I annotate images?');
                                            }
                                        }}
                                    >
                                        <action.icon size={16} />
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-accent text-accent-foreground'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-lg bg-accent px-4 py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-accent-foreground" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-bg-card/40 p-4 backdrop-blur">
                {error && (
                    <Alert variant="destructive" className="mb-4 max-w-4xl mx-auto">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="relative z-10 flex flex-col w-full mx-auto max-w-2xl content-center">
                    <form
                        className="overflow-visible rounded-xl border p-2 transition-colors duration-200 focus-within:border-ring"
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onSubmit={handleSubmit}
                    >
                        {attachedFiles.length > 0 && (
                            <div className="relative flex w-fit items-center gap-2 mb-2 overflow-hidden">
                                {attachedFiles.map((file) => (
                                    <Badge
                                        variant="outline"
                                        className="group relative h-6 max-w-30 cursor-pointer overflow-hidden text-[13px] transition-colors hover:bg-accent px-0"
                                        key={file.id}
                                    >
                                        <span className="flex h-full items-center gap-1.5 overflow-hidden pl-1 font-normal">
                                            <div className="relative flex h-4 min-w-4 items-center justify-center">
                                                {file.preview ? (
                                                    <Image
                                                        alt={file.name}
                                                        className="absolute inset-0 h-4 w-4 rounded border object-cover"
                                                        src={file.preview}
                                                        width={16}
                                                        height={16}
                                                    />
                                                ) : (
                                                    <Paperclip className="opacity-60" size={12} />
                                                )}
                                            </div>
                                            <span className="inline overflow-hidden truncate pr-1.5 transition-all">
                                                {file.name}
                                            </span>
                                        </span>
                                        <button
                                            className="absolute right-1 z-10 rounded-sm p-0.5 text-muted-foreground opacity-0 focus-visible:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background group-hover:opacity-100"
                                            onClick={() => handleRemoveFile(file.id)}
                                            type="button"
                                        >
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Textarea
                            ref={textareaRef}
                            className="max-h-50 min-h-12 resize-none rounded-none border-none bg-transparent! p-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything, create workspaces, or manage your annotations..."
                            value={prompt}
                            disabled={isLoading}
                        />

                        <div className="flex items-center gap-1">
                            <div className="flex items-end gap-0.5 sm:gap-1">
                                <input
                                    className="sr-only"
                                    multiple
                                    onChange={handleFileSelect}
                                    ref={fileInputRef}
                                    type="file"
                                />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className="ml-[-2px] h-7 w-7 rounded-md"
                                            size="icon"
                                            type="button"
                                            variant="ghost"
                                        >
                                            <Plus size={16} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className="max-w-xs rounded-2xl p-1.5"
                                    >
                                        <DropdownMenuGroup className="space-y-1">
                                            <DropdownMenuItem
                                                className="rounded-[calc(1rem-6px)] text-xs"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Paperclip className="text-muted-foreground" size={16} />
                                                    <span>Attach Files</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Link className="text-muted-foreground" size={16} />
                                                    <span>Import from URL</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Clipboard className="text-muted-foreground" size={16} />
                                                    <span>Paste from Clipboard</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="text-muted-foreground" size={16} />
                                                    <span>Use Template</span>
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className="size-7 rounded-md"
                                            size="icon"
                                            type="button"
                                            variant="ghost"
                                        >
                                            <Settings size={16} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className="w-48 rounded-2xl p-3"
                                    >
                                        <DropdownMenuGroup className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="text-muted-foreground" size={16} />
                                                    <Label className="text-xs">Auto-complete</Label>
                                                </div>
                                                <Switch
                                                    checked={settings.autoComplete}
                                                    className="scale-75"
                                                    onCheckedChange={(value) =>
                                                        updateSetting('autoComplete', value)
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Play className="text-muted-foreground" size={16} />
                                                    <Label className="text-xs">Streaming</Label>
                                                </div>
                                                <Switch
                                                    checked={settings.streaming}
                                                    className="scale-75"
                                                    onCheckedChange={(value) =>
                                                        updateSetting('streaming', value)
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <History className="text-muted-foreground" size={16} />
                                                    <Label className="text-xs">Show History</Label>
                                                </div>
                                                <Switch
                                                    checked={settings.showHistory}
                                                    className="scale-75"
                                                    onCheckedChange={(value) =>
                                                        updateSetting('showHistory', value)
                                                    }
                                                />
                                            </div>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                                <Button
                                    className="h-7 w-7 rounded-md"
                                    disabled={!prompt.trim() || isLoading}
                                    size="icon"
                                    type="submit"
                                    variant="default"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowUp size={16} />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div
                            className={cn(
                                'absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-[inherit] border border-border border-dashed bg-muted text-foreground text-sm transition-opacity duration-200',
                                isDragOver ? 'opacity-100' : 'opacity-0'
                            )}
                        >
                            <span className="flex w-full items-center justify-center gap-1 font-medium">
                                <CirclePlus className="min-w-4" size={16} />
                                Drop files here to add as attachments
                            </span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;

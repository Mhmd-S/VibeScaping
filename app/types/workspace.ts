export interface AnnotatedImageSummary {
    id: string;
    generatedImageUrl: string;
    originalImageUrl: string | null;
    mimeType: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Workspace {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    lastOpenedAt: string | null;
    lastAnnotatedImage?: AnnotatedImageSummary | null;
}


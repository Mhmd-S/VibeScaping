export interface Design {
    id: string;
    projectId: string;
    generatedImageUrl: string;
    originalImageUrl: string | null;
    mimeType: string;
    description?: string | null;
    revisionHistory?: unknown;
    createdAt: string;
    updatedAt: string;
}


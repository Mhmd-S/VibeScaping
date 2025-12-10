export interface ProjectDesignSummary {
    id: string;
    generatedImageUrl: string;
    originalImageUrl: string | null;
    mimeType: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    lastOpenedAt: string | null;
    lastDesign?: ProjectDesignSummary | null;
}


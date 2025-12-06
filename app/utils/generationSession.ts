'use client';

import { GeneratedImage, RevisionNode } from '../types/landscape';

const STORAGE_KEY = 'landscape-session';

export interface GenerationSession {
    generatedImage: GeneratedImage;
    originalCapturedImage: GeneratedImage | null;
    revisionHistory: RevisionNode[];
    currentRevisionId: string | null;
}

export const saveGenerationSession = (session: GenerationSession) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const loadGenerationSession = (): GenerationSession | null => {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as GenerationSession;
    } catch {
        return null;
    }
};

export const clearGenerationSession = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
};


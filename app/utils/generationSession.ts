'use client';

import { GeneratedImage, RevisionNode } from '../types/annotation';

const STORAGE_KEY = 'landscape-session';

export interface GenerationSession {
    generatedImage: GeneratedImage;
    originalCapturedImage: GeneratedImage | null;
    revisionHistory: RevisionNode[];
    currentRevisionId: string | null;
    isReplicaApproved: boolean;
    projectId?: string | null;
}

const MAX_REVISIONS_TO_STORE = 3;
const MAX_SESSION_BYTES = 4_500_000; // keep safely under typical 5MB limits

const pruneSession = (session: GenerationSession): GenerationSession => {
    const trimmedHistory = session.revisionHistory.slice(-MAX_REVISIONS_TO_STORE);
    return {
        ...session,
        revisionHistory: trimmedHistory,
    };
};

const clampToQuota = (session: GenerationSession): GenerationSession => {
    const serialized = JSON.stringify(session);
    if (serialized.length <= MAX_SESSION_BYTES) {
        return session;
    }

    // If we're over quota, keep only the current image and drop heavy fields.
    return {
        generatedImage: session.generatedImage,
        originalCapturedImage: null,
        revisionHistory: [],
        currentRevisionId: session.currentRevisionId,
        isReplicaApproved: session.isReplicaApproved,
        projectId: session.projectId ?? null,
    };
};

export const saveGenerationSession = (session: GenerationSession) => {
    if (typeof window === 'undefined') return;
    const pruned = pruneSession(session);
    const safeSession = clampToQuota(pruned);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeSession));
};

export const loadGenerationSession = (): GenerationSession | null => {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<GenerationSession>;
        return {
            generatedImage: parsed.generatedImage as GeneratedImage,
            originalCapturedImage: parsed.originalCapturedImage ?? null,
            revisionHistory: parsed.revisionHistory ?? [],
            currentRevisionId: parsed.currentRevisionId ?? null,
            isReplicaApproved: parsed.isReplicaApproved ?? false,
            projectId: parsed.projectId ?? null,
        };
    } catch {
        return null;
    }
};

export const clearGenerationSession = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
};


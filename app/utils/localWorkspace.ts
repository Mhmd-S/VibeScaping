'use client';

import { Workspace } from '../types/workspace';

const STORAGE_KEY = 'landscaping_workspaces';

export interface LocalWorkspace {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    lastOpenedAt: string | null;
}

const generateWorkspaceId = (): string => {
    if (typeof window === 'undefined') {
        // Return a placeholder during SSR - will be regenerated on client
        return `workspace_placeholder_${Math.random().toString(36).substr(2, 9)}`;
    }
    return `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getAllWorkspaces = (): LocalWorkspace[] => {
    if (typeof window === 'undefined') return [];
    
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as LocalWorkspace[];
    } catch {
        return [];
    }
};

export const getWorkspace = (id: string): LocalWorkspace | null => {
    const workspaces = getAllWorkspaces();
    return workspaces.find((w) => w.id === id) || null;
};

export const createWorkspace = (name?: string): LocalWorkspace => {
    if (typeof window === 'undefined') {
        // Return a placeholder during SSR - should not be called on server
        const now = new Date().toISOString();
        return {
            id: 'placeholder',
            name: name || 'Workspace',
            description: null,
            createdAt: now,
            updatedAt: now,
            lastOpenedAt: now,
        };
    }
    
    const workspaces = getAllWorkspaces();
    const now = new Date().toISOString();
    
    // Use ISO string instead of toLocaleString to avoid locale differences
    const defaultName = name || `Workspace ${new Date().toISOString().split('T')[0]}`;
    
    const workspace: LocalWorkspace = {
        id: generateWorkspaceId(),
        name: defaultName,
        description: null,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
    };
    
    workspaces.push(workspace);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    
    return workspace;
};

export const updateWorkspace = (id: string, updates: Partial<Pick<LocalWorkspace, 'name' | 'description'>>): LocalWorkspace | null => {
    const workspaces = getAllWorkspaces();
    const index = workspaces.findIndex((w) => w.id === id);
    
    if (index === -1) return null;
    
    workspaces[index] = {
        ...workspaces[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    return workspaces[index];
};

export const deleteWorkspace = (id: string): boolean => {
    const workspaces = getAllWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    
    if (filtered.length === workspaces.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
};

export const updateLastOpened = (id: string): void => {
    const workspaces = getAllWorkspaces();
    const index = workspaces.findIndex((w) => w.id === id);
    
    if (index === -1) return;
    
    workspaces[index].lastOpenedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
};

export const restoreWorkspace = (workspace: LocalWorkspace): void => {
    const workspaces = getAllWorkspaces();
    // Check if it already exists to prevent duplicates
    if (!workspaces.find(w => w.id === workspace.id)) {
        workspaces.push(workspace);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    }
};

export const toWorkspaceType = (local: LocalWorkspace): Workspace => {
    return {
        id: local.id,
        name: local.name,
        description: local.description,
        createdAt: local.createdAt,
        updatedAt: local.updatedAt,
        lastOpenedAt: local.lastOpenedAt,
        lastAnnotatedImage: null,
    };
};


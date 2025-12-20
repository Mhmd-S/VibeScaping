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
    const workspaces = getAllWorkspaces();
    const now = new Date().toISOString();
    
    const workspace: LocalWorkspace = {
        id: generateWorkspaceId(),
        name: name || `Workspace ${new Date().toLocaleString()}`,
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


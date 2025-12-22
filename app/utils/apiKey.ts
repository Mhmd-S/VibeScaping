'use client';

const STORAGE_KEY = 'landscaping_gemini_api_key';

export const getApiKey = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

export const setApiKey = (key: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.setItem(STORAGE_KEY, key.trim());
    } catch (error) {
        console.error('Failed to save API key:', error);
    }
};

export const deleteApiKey = (): void => {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to delete API key:', error);
    }
};

export const hasApiKey = (): boolean => {
    return getApiKey() !== null;
};

/**
 * Check if user is using BYOK (Bring Your Own Key) mode
 * This means they have provided their own API key and should bypass credit checks
 */
export const isUsingBYOK = (): boolean => {
    return hasApiKey();
};


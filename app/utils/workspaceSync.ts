import { supabase } from '@/lib/supabase';
import { hasActiveSubscription } from './subscription';
import {
    uploadWorkspaceDataToCloudflare,
    getWorkspaceDataFromCloudflare,
    generateDataHash,
} from './cloudflare';
import { getWorkspaceData, saveWorkspaceData } from './db';
import { LocalWorkspace, getAllWorkspaces, getWorkspace } from './localWorkspace';

export type WorkspaceMode = 'local' | 'cloud' | 'hybrid';

/**
 * Determine if user should sync to cloud
 * Only paid tier users (with active subscription) can sync to cloud.
 * Free tier users can only save locally.
 */
export const shouldSyncToCloud = async (userId: string | null): Promise<boolean> => {
    if (!userId) return false;

    const hasSubscription = await hasActiveSubscription(userId);

    // Only paid tier users (with active subscription) can sync to cloud
    // Free tier users must save locally only
    return hasSubscription;
};

/**
 * Get workspace storage mode
 */
export const getWorkspaceMode = async (userId: string | null): Promise<WorkspaceMode> => {
    if (!userId) return 'local';

    const hasSubscription = await hasActiveSubscription(userId);

    if (hasSubscription) {
        return 'cloud';
    }

    return 'local';
};

/**
 * Sync local workspace to cloud (DB + Cloudflare)
 * Only available for paid tier users with active subscription.
 * Free tier users cannot use this function.
 */
export const syncWorkspaceToCloud = async (
    workspaceId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> => {
    // Verify user has active subscription before syncing
    const hasSubscription = await hasActiveSubscription(userId);
    if (!hasSubscription) {
        return {
            success: false,
            error: 'Cloud sync requires an active subscription. Free tier users can only save locally.',
        };
    }

    try {
        // Get local workspace metadata
        const localWorkspace = getWorkspace(workspaceId);
        if (!localWorkspace) {
            return { success: false, error: 'Workspace not found locally' };
        }

        // Get local workspace data from IndexedDB
        const localData = await getWorkspaceData(workspaceId);
        if (!localData) {
            return { success: false, error: 'Workspace data not found' };
        }

        // Upload workspace data to Cloudflare
        const uploadResult = await uploadWorkspaceDataToCloudflare(localData, workspaceId);
        const dataHash = generateDataHash(localData);

        // Check if workspace already exists
        const { data: existingWorkspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .single();

        if (existingWorkspace) {
            // Update existing workspace
            await supabase
                .from('workspaces')
                .update({
                    name: localWorkspace.name,
                    description: localWorkspace.description,
                    updated_at: new Date(localWorkspace.updatedAt).toISOString(),
                    last_opened_at: localWorkspace.lastOpenedAt
                        ? new Date(localWorkspace.lastOpenedAt).toISOString()
                        : null,
                })
                .eq('id', workspaceId);

            // Upsert workspace data
            const { data: existingData } = await supabase
                .from('workspace_data')
                .select('id')
                .eq('workspace_id', workspaceId)
                .single();

            if (existingData) {
                await supabase
                    .from('workspace_data')
                    .update({
                        cloudflare_url: uploadResult.url,
                        data_hash: dataHash,
                    })
                    .eq('workspace_id', workspaceId);
            } else {
                await supabase.from('workspace_data').insert({
                    workspace_id: workspaceId,
                    cloudflare_url: uploadResult.url,
                    data_hash: dataHash,
                });
            }
        } else {
            // Create new workspace
            await supabase.from('workspaces').insert({
                id: workspaceId,
                user_id: userId,
                name: localWorkspace.name,
                description: localWorkspace.description,
                created_at: new Date(localWorkspace.createdAt).toISOString(),
                updated_at: new Date(localWorkspace.updatedAt).toISOString(),
                last_opened_at: localWorkspace.lastOpenedAt
                    ? new Date(localWorkspace.lastOpenedAt).toISOString()
                    : null,
            });

            await supabase.from('workspace_data').insert({
                workspace_id: workspaceId,
                cloudflare_url: uploadResult.url,
                data_hash: dataHash,
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error syncing workspace to cloud:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to sync workspace',
        };
    }
};

/**
 * Load workspace from cloud
 * Only available for paid tier users with active subscription.
 * Free tier users cannot load from cloud.
 */
export const loadWorkspaceFromCloud = async (
    workspaceId: string,
    userId: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
    // Verify user has active subscription before loading from cloud
    const hasSubscription = await hasActiveSubscription(userId);
    if (!hasSubscription) {
        return {
            success: false,
            error: 'Loading from cloud requires an active subscription. Free tier users can only access local workspaces.',
        };
    }

    try {
        // Get workspace from database
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('*, workspace_data(*)')
            .eq('id', workspaceId)
            .eq('user_id', userId)
            .single();

        if (!workspace) {
            return { success: false, error: 'Workspace not found' };
        }

        // Get workspace data from Cloudflare
        const workspaceData = Array.isArray(workspace.workspace_data)
            ? workspace.workspace_data[0]
            : workspace.workspace_data;

        if (!workspaceData) {
            return { success: false, error: 'Workspace data not found in cloud' };
        }

        const data = await getWorkspaceDataFromCloudflare(workspaceId);
        if (!data) {
            return { success: false, error: 'Failed to load workspace data from cloud' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error loading workspace from cloud:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load workspace',
        };
    }
};

/**
 * Migrate local workspaces to cloud when user subscribes
 */
export const migrateLocalWorkspacesToCloud = async (
    userId: string
): Promise<{ success: boolean; migrated: number; errors: string[] }> => {
    const errors: string[] = [];
    let migrated = 0;

    try {
        const localWorkspaces = getAllWorkspaces();

        for (const localWorkspace of localWorkspaces) {
            try {
                const result = await syncWorkspaceToCloud(localWorkspace.id, userId);
                if (result.success) {
                    migrated++;
                } else {
                    errors.push(`Failed to migrate ${localWorkspace.name}: ${result.error}`);
                }
            } catch (error) {
                errors.push(
                    `Error migrating ${localWorkspace.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }

        return { success: errors.length === 0, migrated, errors };
    } catch (error) {
        console.error('Error migrating workspaces:', error);
        return {
            success: false,
            migrated,
            errors: [
                ...errors,
                error instanceof Error ? error.message : 'Failed to migrate workspaces',
            ],
        };
    }
};

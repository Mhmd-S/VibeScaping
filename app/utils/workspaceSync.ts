import { supabase } from '@/lib/supabase';
import {
    getWorkspaceDataFromCloudflare,
} from './cloudflare';
import { LocalWorkspace } from './localWorkspace';

export type WorkspaceMode = 'local' | 'cloud' | 'hybrid';

/**
 * Determine if user should sync to cloud.
 * All authenticated users can sync to cloud.
 */
export const shouldSyncToCloud = async (userId: string | null): Promise<boolean> => {
    return !!userId;
};

/**
 * Get workspace storage mode
 */
export const getWorkspaceMode = async (userId: string | null): Promise<WorkspaceMode> => {
    if (!userId) return 'local';
    return 'cloud';
};

/**
 * Sync workspace metadata to cloud (DB only).
 * The client uploads workspace data directly to R2 via presigned URL.
 */
export const syncWorkspaceMetadataToCloud = async (
    workspaceId: string,
    userId: string,
    localWorkspace: LocalWorkspace,
    cloudflareUrl: string,
    dataHash: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!localWorkspace) {
            return { success: false, error: 'Workspace not found locally' };
        }

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
                        cloudflare_url: cloudflareUrl,
                        data_hash: dataHash,
                    })
                    .eq('workspace_id', workspaceId);
            } else {
                await supabase.from('workspace_data').insert({
                    workspace_id: workspaceId,
                    cloudflare_url: cloudflareUrl,
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
                cloudflare_url: cloudflareUrl,
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
 */
export const loadWorkspaceFromCloud = async (
    workspaceId: string,
    userId: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
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

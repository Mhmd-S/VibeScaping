import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { syncWorkspaceMetadataToCloud, shouldSyncToCloud } from '@/app/utils/workspaceSync';

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const body = await request.json();
        const { workspaceId, workspace, cloudflareUrl, dataHash } = body;

        if (!workspaceId || !workspace || !cloudflareUrl || !dataHash) {
            return NextResponse.json(
                { error: 'workspaceId, workspace, cloudflareUrl, and dataHash are required' },
                { status: 400 }
            );
        }

        const shouldSync = await shouldSyncToCloud(userId);
        if (!shouldSync) {
            return NextResponse.json({ success: true, synced: false });
        }

        const result = await syncWorkspaceMetadataToCloud(
            workspaceId,
            userId,
            workspace,
            cloudflareUrl,
            dataHash
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to sync workspace' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, synced: true });
    } catch (error) {
        console.error('Error syncing workspace:', error);
        return NextResponse.json(
            { error: 'Failed to sync workspace' },
            { status: 500 }
        );
    }
}

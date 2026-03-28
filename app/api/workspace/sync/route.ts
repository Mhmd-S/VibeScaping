import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { syncWorkspaceToCloud, shouldSyncToCloud } from '@/app/utils/workspaceSync';
import { getWorkspaceData } from '@/app/utils/db';

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const body = await request.json();
        const { workspaceId } = body;

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Workspace ID is required' },
                { status: 400 }
            );
        }

        // Check if user has active subscription (required for cloud sync)
        const { hasActiveSubscription } = await import('@/app/utils/subscription');
        const hasSubscription = await hasActiveSubscription(userId);

        if (!hasSubscription) {
            return NextResponse.json(
                {
                    success: false,
                    synced: false,
                    error: 'Cloud sync requires an active subscription',
                    details: 'Free tier users can only save locally. Please upgrade to sync to cloud.'
                },
                { status: 403 }
            );
        }

        const shouldSync = await shouldSyncToCloud(userId);
        if (!shouldSync) {
            return NextResponse.json({ success: true, synced: false });
        }

        // Sync workspace to cloud
        const result = await syncWorkspaceToCloud(workspaceId, userId);

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


import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { getPresignedUploadUrl } from '@/app/utils/cloudflare';

export async function POST(request: NextRequest) {
    try {
        await requireAuth();

        const { workspaceId } = await request.json();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspaceId is required' },
                { status: 400 }
            );
        }

        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(workspaceId);

        return NextResponse.json({ uploadUrl, publicUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}

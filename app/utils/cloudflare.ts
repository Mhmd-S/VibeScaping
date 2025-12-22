import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 is S3-compatible
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME || '';
const PUBLIC_URL = process.env.CLOUDFLARE_PUBLIC_URL || '';

export interface UploadResult {
    url: string;
    key: string;
}

/**
 * Upload image to Cloudflare R2
 */
export const uploadImageToCloudflare = async (
    imageBase64: string,
    mimeType: string,
    workspaceId: string
): Promise<UploadResult> => {
    const buffer = Buffer.from(imageBase64, 'base64');
    const key = `images/${workspaceId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${mimeType.split('/')[1] || 'png'}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    });

    await s3Client.send(command);

    const url = `${PUBLIC_URL}/${key}`;
    return { url, key };
};

/**
 * Upload workspace data to Cloudflare R2
 */
export const uploadWorkspaceDataToCloudflare = async (
    data: any,
    workspaceId: string
): Promise<UploadResult> => {
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, 'utf-8');
    const key = `workspaces/${workspaceId}/data.json`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'application/json',
    });

    await s3Client.send(command);

    const url = `${PUBLIC_URL}/${key}`;
    return { url, key };
};

/**
 * Get workspace data from Cloudflare R2
 */
export const getWorkspaceDataFromCloudflare = async (
    workspaceId: string
): Promise<any | null> => {
    try {
        const key = `workspaces/${workspaceId}/data.json`;

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        const body = await response.Body?.transformToString();

        if (!body) {
            return null;
        }

        return JSON.parse(body);
    } catch (error: any) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
};

/**
 * Delete asset from Cloudflare R2
 */
export const deleteFromCloudflare = async (url: string): Promise<void> => {
    try {
        // Extract key from URL
        const key = url.replace(`${PUBLIC_URL}/`, '');

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting from Cloudflare:', error);
        // Don't throw - deletion failures shouldn't break the app
    }
};

/**
 * Generate a hash for data change detection
 */
export const generateDataHash = (data: any): string => {
    const jsonString = JSON.stringify(data);
    // Simple hash function for change detection
    // In production, consider using crypto.createHash('sha256') for better collision resistance
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
};


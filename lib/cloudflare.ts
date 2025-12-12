import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface UploadImageParams {
    base64: string;
    mimeType: string;
    keyPrefix?: string;
}

const getEnv = () => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET;
    const publicBaseUrl =
        process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error('Cloudflare R2 environment variables are not fully configured');
    }

    return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
};

const buildClient = () => {
    const { accountId, accessKeyId, secretAccessKey } = getEnv();

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
};

const inferExtension = (mimeType: string) => {
    const map: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/webp': 'webp',
    };

    return map[mimeType.toLowerCase()] ?? 'bin';
};

export const uploadBase64Image = async ({ base64, mimeType, keyPrefix }: UploadImageParams) => {
    const { bucket, publicBaseUrl, accountId } = getEnv();
    const client = buildClient();

    const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
    const body = Buffer.from(cleaned, 'base64');
    const extension = inferExtension(mimeType);
    const key = `${keyPrefix ? `${keyPrefix.replace(/\/$/, '')}/` : ''}${Date.now()}-${randomUUID()}.${extension}`;

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: mimeType,
        }),
    );

    const baseUrl =
        publicBaseUrl ||
        `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;

    return `${baseUrl}/${key}`;
};


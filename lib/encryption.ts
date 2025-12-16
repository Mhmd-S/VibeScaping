import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable or generate a default
 * In production, this should be a secure environment variable
 */
const getEncryptionKey = (): Buffer => {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
        return Buffer.from(envKey, 'hex');
    }
    
    // Fallback: use a default key (not secure for production)
    // This is only for development/testing
    const defaultKey = 'default-encryption-key-32-bytes-long!!';
    return scryptSync(defaultKey, 'salt', 32);
};

/**
 * Encrypts a string value (e.g., API key)
 */
export const encrypt = (text: string): string => {
    if (!text) return '';
    
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an encrypted string value
 */
export const decrypt = (encryptedText: string): string => {
    if (!encryptedText) return '';
    
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }
        
        const [ivHex, tagHex, encrypted] = parts;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt value');
    }
};


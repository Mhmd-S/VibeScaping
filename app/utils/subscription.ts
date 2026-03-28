import { supabase } from '@/lib/supabase';

// Re-export client-safe constants
export {
    SUBSCRIPTION_PLANS,
    TOP_UP_PRODUCTS,
    getTopUpProduct,
    getSubscriptionPlan,
    getCreditsForPlan,
} from './subscription-plans';
export type { SubscriptionPlan, TopUpProduct, UserTier } from './subscription-plans';

// Price IDs (server-only, read from env)
export const PLAN_PRICE_IDS: Record<string, string> = {
    monthly: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    yearly: process.env.STRIPE_YEARLY_PRICE_ID || '',
};

export const TOPUP_PRICE_IDS: Record<string, string> = {
    'topup-starter': process.env.STRIPE_TOPUP_STARTER_PRICE_ID || '',
    'topup-standard': process.env.STRIPE_TOPUP_STANDARD_PRICE_ID || '',
    'topup-pro': process.env.STRIPE_TOPUP_PRO_PRICE_ID || '',
    'topup-mega': process.env.STRIPE_TOPUP_MEGA_PRICE_ID || '',
};

export const getSubscription = async (userId: string) => {
    const { data } = await supabase
        .from('subscriptions')
        .select()
        .eq('user_id', userId)
        .single();

    return data;
};

export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
    const subscription = await getSubscription(userId);
    if (!subscription) return false;

    if (subscription.status !== 'active') return false;

    if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
        return false;
    }

    return true;
};

/**
 * Get user's tier based on subscription status
 */
export const getUserTier = async (userId: string): Promise<'free' | 'paid'> => {
    const hasActive = await hasActiveSubscription(userId);
    return hasActive ? 'paid' : 'free';
};

/**
 * Get allowed models for a user tier
 * Free tier: Only cheaper models
 * Paid tier: All models
 */
export const getAllowedModels = (tier: 'free' | 'paid'): string[] => {
    const allModels = [
        'gemini-3-pro-image-preview',
        'gemini-2.5-flash-image',
    ];

    if (tier === 'free') {
        return ['gemini-2.5-flash-image'];
    }

    return allModels;
};

/**
 * Check if a model is allowed for a user
 */
export const isModelAllowed = async (
    userId: string,
    model: string,
): Promise<boolean> => {
    const tier = await getUserTier(userId);
    const allowedModels = getAllowedModels(tier);
    return allowedModels.includes(model);
};

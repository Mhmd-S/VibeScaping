import { prisma } from '@/lib/prisma';

export interface SubscriptionPlan {
    id: string;
    name: string;
    priceId: string;
    credits: number;
    price: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'basic',
        name: 'Basic',
        priceId: process.env.STRIPE_PRICE_ID_BASIC || '',
        credits: 75, // 75 credits per month as per plan
        price: 9.99, // $9.99/month
    },
];

export interface TopUpProduct {
    id: string;
    name: string;
    priceId: string;
    credits: number;
    price: number;
}

export const TOP_UP_PRODUCTS: TopUpProduct[] = [
    {
        id: 'topup-25',
        name: '25 Credits',
        priceId: process.env.STRIPE_PRICE_ID_TOPUP_25 || '',
        credits: 25,
        price: 2.99,
    },
    {
        id: 'topup-50',
        name: '50 Credits',
        priceId: process.env.STRIPE_PRICE_ID_TOPUP_50 || '',
        credits: 50,
        price: 4.99,
    },
    {
        id: 'topup-100',
        name: '100 Credits',
        priceId: process.env.STRIPE_PRICE_ID_TOPUP_100 || '',
        credits: 100,
        price: 8.99,
    },
    {
        id: 'topup-200',
        name: '200 Credits',
        priceId: process.env.STRIPE_PRICE_ID_TOPUP_200 || '',
        credits: 200,
        price: 15.99,
    },
];

export const getTopUpProduct = (productId: string): TopUpProduct | null => {
    return TOP_UP_PRODUCTS.find((p) => p.id === productId) || null;
};

export const getSubscription = async (userId: string) => {
    return await prisma.subscription.findUnique({
        where: { userId },
    });
};

export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
    const subscription = await getSubscription(userId);
    if (!subscription) return false;

    if (subscription.status !== 'active') return false;

    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
        return false;
    }

    return true;
};

export const getSubscriptionPlan = (planId: string): SubscriptionPlan | null => {
    return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || null;
};

export const getCreditsForPlan = (planId: string): number => {
    const plan = getSubscriptionPlan(planId);
    return plan?.credits || 0;
};

export type UserTier = 'free' | 'paid';

/**
 * Get user's tier based on subscription status
 */
export const getUserTier = async (userId: string): Promise<UserTier> => {
    const hasActive = await hasActiveSubscription(userId);
    return hasActive ? 'paid' : 'free';
};

/**
 * Get allowed models for a user tier
 * Free tier (credit-based): Only cheaper models
 * Free tier (BYOK): All models
 * Paid tier: All models
 */
export const getAllowedModels = (tier: UserTier, isBYOK: boolean = false): string[] => {
    const allModels = [
        'gemini-3-pro-image-preview',
        'gemini-2.5-flash-image',
    ];

    // If using BYOK, all models are allowed regardless of tier
    if (isBYOK) {
        return allModels;
    }

    // For credit-based usage:
    // Free tier: Only cheaper models
    // Paid tier: All models
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
    isBYOK: boolean = false
): Promise<boolean> => {
    const tier = await getUserTier(userId);
    const allowedModels = getAllowedModels(tier, isBYOK);
    return allowedModels.includes(model);
};


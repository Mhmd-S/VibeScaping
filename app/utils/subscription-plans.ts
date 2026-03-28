// Client-safe subscription plan and top-up constants (no server imports)

export interface SubscriptionPlan {
    id: string;
    name: string;
    credits: number;
    price: number;
    interval: 'month' | 'year';
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'monthly',
        name: 'Monthly',
        credits: 100,
        price: 20,
        interval: 'month',
    },
    {
        id: 'yearly',
        name: 'Yearly',
        credits: 110,
        price: 192,
        interval: 'year',
    },
];

export interface TopUpProduct {
    id: string;
    name: string;
    credits: number;
    price: number;
}

export const TOP_UP_PRODUCTS: TopUpProduct[] = [
    {
        id: 'topup-starter',
        name: 'Starter Pack',
        credits: 25,
        price: 4.99,
    },
    {
        id: 'topup-standard',
        name: 'Standard Pack',
        credits: 50,
        price: 9.99,
    },
    {
        id: 'topup-pro',
        name: 'Pro Pack',
        credits: 100,
        price: 19.99,
    },
    {
        id: 'topup-mega',
        name: 'Mega Pack',
        credits: 200,
        price: 39.99,
    },
];

export const getTopUpProduct = (productId: string): TopUpProduct | null => {
    return TOP_UP_PRODUCTS.find((p) => p.id === productId) || null;
};

export const getSubscriptionPlan = (planId: string): SubscriptionPlan | null => {
    return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || null;
};

export const getCreditsForPlan = (planId: string): number => {
    const plan = getSubscriptionPlan(planId);
    return plan?.credits || 0;
};

export type UserTier = 'free' | 'paid';

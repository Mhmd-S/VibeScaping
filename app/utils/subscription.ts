import { supabase } from '@/lib/supabase';

// Re-export client-safe constants
export {
    TOP_UP_PRODUCTS,
    getTopUpProduct,
} from './subscription-plans';
export type { TopUpProduct } from './subscription-plans';

// Top-up price IDs (server-only, read from env)
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

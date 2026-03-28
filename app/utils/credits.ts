import { supabase } from '@/lib/supabase';

// Free tier: 5 generations per month
export const FREE_MONTHLY_GENERATIONS = 5;

// Model-based credit costs
export const MODEL_CREDIT_COSTS: Record<string, number> = {
    'gemini-3-pro-image-preview': 5, // Expensive model (Banana Pro)
    'gemini-2.5-flash-image': 1,
    'gemini-2.0-flash-exp': 1,
    // Default cost for other models
    default: 1,
};

// Whitelist of allowed model names for security
export const ALLOWED_MODELS: string[] = [
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp',
];

export const isValidModel = (model?: string): boolean => {
    if (!model) return false;
    return ALLOWED_MODELS.includes(model);
};

export const getCreditCost = (model?: string): number => {
    if (!model) return MODEL_CREDIT_COSTS.default;
    return MODEL_CREDIT_COSTS[model] || MODEL_CREDIT_COSTS.default;
};

export const getCreditBalance = async (userId: string): Promise<number> => {
    const { data } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

    return data?.balance || 0;
};

export const checkCreditsAvailable = async (
    userId: string,
    required: number
): Promise<boolean> => {
    const balance = await getCreditBalance(userId);
    return balance >= required;
};

export const deductCredits = async (
    userId: string,
    amount: number,
    model?: string,
    workspaceId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> => {
    try {
        // Atomic check-and-deduct using RPC function
        const { data: newBalance, error } = await supabase.rpc('deduct_credits', {
            p_user_id: userId,
            p_amount: amount,
        });

        if (error) throw error;

        if (newBalance === null) {
            // Either user doesn't exist or insufficient balance
            return {
                success: false,
                newBalance: await getCreditBalance(userId),
                error: 'Insufficient credits',
            };
        }

        // Log transaction
        await supabase.from('credit_transactions').insert({
            user_id: userId,
            type: 'deduct',
            amount,
            model: model ?? null,
            workspace_id: workspaceId ?? null,
        });

        return {
            success: true,
            newBalance,
        };
    } catch (error) {
        console.error('Error deducting credits:', error);
        return {
            success: false,
            newBalance: await getCreditBalance(userId),
            error: 'Failed to deduct credits',
        };
    }
};

export const grantCredits = async (
    userId: string,
    amount: number,
    reason?: string
): Promise<{ success: boolean; newBalance: number }> => {
    try {
        // Try to update existing balance first
        const { data: existing } = await supabase
            .from('credit_balances')
            .select('balance')
            .eq('user_id', userId)
            .single();

        let newBalance: number;

        if (existing) {
            const { data, error } = await supabase
                .from('credit_balances')
                .update({ balance: existing.balance + amount })
                .eq('user_id', userId)
                .select('balance')
                .single();

            if (error) throw error;
            newBalance = data!.balance;
        } else {
            const { data, error } = await supabase
                .from('credit_balances')
                .insert({
                    user_id: userId,
                    balance: amount,
                })
                .select('balance')
                .single();

            if (error) throw error;
            newBalance = data!.balance;
        }

        // Log transaction
        await supabase.from('credit_transactions').insert({
            user_id: userId,
            type: 'grant',
            amount,
            reason: reason ?? null,
        });

        return {
            success: true,
            newBalance,
        };
    } catch (error) {
        console.error('Error granting credits:', error);
        const currentBalance = await getCreditBalance(userId);
        return {
            success: false,
            newBalance: currentBalance,
        };
    }
};

export const getCreditTransactions = async (
    userId: string,
    limit: number = 50
) => {
    const { data } = await supabase
        .from('credit_transactions')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    return data || [];
};

/**
 * Get or create a credit balance for a user, auto-resetting free generations monthly
 */
const getOrCreateCreditBalance = async (userId: string) => {
    let { data: creditBalance } = await supabase
        .from('credit_balances')
        .select()
        .eq('user_id', userId)
        .single();

    if (!creditBalance) {
        const { data, error } = await supabase
            .from('credit_balances')
            .insert({
                user_id: userId,
                balance: 0,
                free_generations_used: 0,
                free_generations_reset_date: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        creditBalance = data!;
    }

    // Check if we need to reset the monthly free generations
    const now = new Date();
    const resetDate = new Date(creditBalance.free_generations_reset_date);
    if (
        now.getMonth() !== resetDate.getMonth() ||
        now.getFullYear() !== resetDate.getFullYear()
    ) {
        const { data, error } = await supabase
            .from('credit_balances')
            .update({
                free_generations_used: 0,
                free_generations_reset_date: now.toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        creditBalance = data!;
    }

    return creditBalance;
};

/**
 * Check how many free generations a user has remaining this month
 */
export const getFreeGenerationsRemaining = async (userId: string): Promise<number> => {
    const creditBalance = await getOrCreateCreditBalance(userId);
    return Math.max(0, FREE_MONTHLY_GENERATIONS - creditBalance.free_generations_used);
};

/**
 * Use one free generation. Returns true if successful, false if none remaining.
 */
export const useFreeGeneration = async (
    userId: string,
    model?: string,
    workspaceId?: string
): Promise<{ success: boolean; remaining: number }> => {
    try {
        // Ensure balance record exists (and monthly reset is applied)
        await getOrCreateCreditBalance(userId);

        // Atomic check-and-increment using RPC function
        const { data: newCount, error } = await supabase.rpc('use_free_generation', {
            p_user_id: userId,
            p_max_free: FREE_MONTHLY_GENERATIONS,
        });

        if (error) throw error;

        if (newCount === null) {
            return { success: false, remaining: 0 };
        }

        // Log as a transaction for tracking
        await supabase.from('credit_transactions').insert({
            user_id: userId,
            type: 'deduct',
            amount: 0,
            model: model ?? null,
            workspace_id: workspaceId ?? null,
            reason: 'free_generation',
        });

        return {
            success: true,
            remaining: FREE_MONTHLY_GENERATIONS - newCount,
        };
    } catch (error) {
        console.error('Error using free generation:', error);
        return { success: false, remaining: 0 };
    }
};

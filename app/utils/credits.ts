import { prisma } from '@/lib/prisma';

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
    const creditBalance = await prisma.creditBalance.findUnique({
        where: { userId },
    });

    return creditBalance?.balance || 0;
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
        // Check if user has enough credits
        const hasEnough = await checkCreditsAvailable(userId, amount);
        if (!hasEnough) {
            return {
                success: false,
                newBalance: await getCreditBalance(userId),
                error: 'Insufficient credits',
            };
        }

        // Get or create credit balance
        let creditBalance = await prisma.creditBalance.findUnique({
            where: { userId },
        });

        if (!creditBalance) {
            creditBalance = await prisma.creditBalance.create({
                data: {
                    userId,
                    balance: 0,
                },
            });
        }

        // Deduct credits
        const updated = await prisma.creditBalance.update({
            where: { userId },
            data: {
                balance: {
                    decrement: amount,
                },
            },
        });

        // Log transaction
        await prisma.creditTransaction.create({
            data: {
                userId,
                type: 'deduct',
                amount,
                model,
                workspaceId,
            },
        });

        return {
            success: true,
            newBalance: updated.balance,
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
        // Get or create credit balance
        let creditBalance = await prisma.creditBalance.findUnique({
            where: { userId },
        });

        if (!creditBalance) {
            creditBalance = await prisma.creditBalance.create({
                data: {
                    userId,
                    balance: amount,
                },
            });
        } else {
            creditBalance = await prisma.creditBalance.update({
                where: { userId },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });
        }

        // Log transaction
        await prisma.creditTransaction.create({
            data: {
                userId,
                type: 'grant',
                amount,
                reason,
            },
        });

        return {
            success: true,
            newBalance: creditBalance.balance,
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
    return await prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
};

/**
 * Get or create a credit balance for a user, auto-resetting free generations monthly
 */
const getOrCreateCreditBalance = async (userId: string) => {
    let creditBalance = await prisma.creditBalance.findUnique({
        where: { userId },
    });

    if (!creditBalance) {
        creditBalance = await prisma.creditBalance.create({
            data: {
                userId,
                balance: 0,
                freeGenerationsUsed: 0,
                freeGenerationsResetDate: new Date(),
            },
        });
    }

    // Check if we need to reset the monthly free generations
    const now = new Date();
    const resetDate = creditBalance.freeGenerationsResetDate;
    if (
        now.getMonth() !== resetDate.getMonth() ||
        now.getFullYear() !== resetDate.getFullYear()
    ) {
        creditBalance = await prisma.creditBalance.update({
            where: { userId },
            data: {
                freeGenerationsUsed: 0,
                freeGenerationsResetDate: now,
            },
        });
    }

    return creditBalance;
};

/**
 * Check how many free generations a user has remaining this month
 */
export const getFreeGenerationsRemaining = async (userId: string): Promise<number> => {
    const creditBalance = await getOrCreateCreditBalance(userId);
    return Math.max(0, FREE_MONTHLY_GENERATIONS - creditBalance.freeGenerationsUsed);
};

/**
 * Use one free generation. Returns true if successful, false if none remaining.
 */
export const useFreeGeneration = async (
    userId: string,
    model?: string,
    workspaceId?: string
): Promise<{ success: boolean; remaining: number }> => {
    const creditBalance = await getOrCreateCreditBalance(userId);
    const remaining = FREE_MONTHLY_GENERATIONS - creditBalance.freeGenerationsUsed;

    if (remaining <= 0) {
        return { success: false, remaining: 0 };
    }

    const updated = await prisma.creditBalance.update({
        where: { userId },
        data: {
            freeGenerationsUsed: { increment: 1 },
        },
    });

    // Log as a transaction for tracking
    await prisma.creditTransaction.create({
        data: {
            userId,
            type: 'deduct',
            amount: 0, // Free generation, no credit cost
            model,
            workspaceId,
            reason: 'free_generation',
        },
    });

    return {
        success: true,
        remaining: FREE_MONTHLY_GENERATIONS - updated.freeGenerationsUsed,
    };
};


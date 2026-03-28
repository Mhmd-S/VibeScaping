// Client-safe top-up constants (no server imports)

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

interface NearbyQuery {
    latitude: number;
    longitude: number;
    radiusKm: number;
}
export declare const getNearbyOffers: (query: NearbyQuery) => Promise<never>;
export declare const getAllOffers: (options: {
    page: number;
    limit: number;
    category?: string;
}) => Promise<never>;
export declare const getOfferById: (offerId: string) => Promise<never>;
export declare const redeemOffer: (offerId: string, userId: string) => Promise<never>;
export declare const getUserRedemptions: (userId: string, options: {
    page: number;
    limit: number;
}) => Promise<never>;
export declare const generateRedemptionCode: () => string;
export {};
//# sourceMappingURL=offers.service.d.ts.map
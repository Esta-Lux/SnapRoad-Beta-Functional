interface RegisterPartnerData {
    businessName: string;
    contactEmail: string;
    contactPhone?: string;
    subscriptionPlan: 'local' | 'growth' | 'enterprise';
}
interface CreateOfferData {
    title: string;
    description?: string;
    discountPercent: number;
    gemsRequired: number;
    location: {
        lat: number;
        lng: number;
    };
    radiusKm?: number;
    bannerUrl?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare const registerPartner: (data: RegisterPartnerData) => Promise<never>;
export declare const getPartnerProfile: (userId: string) => Promise<never>;
export declare const createOffer: (userId: string, data: CreateOfferData) => Promise<never>;
export declare const getPartnerOffers: (userId: string, status?: string) => Promise<never>;
export declare const updateOffer: (offerId: string, userId: string, data: Partial<CreateOfferData>) => Promise<never>;
export declare const deleteOffer: (offerId: string, userId: string) => Promise<never>;
export declare const getPartnerAnalytics: (userId: string, dateRange: {
    startDate?: string;
    endDate?: string;
}) => Promise<never>;
export declare const getPartnerRedemptions: (userId: string, options: {
    page: number;
    limit: number;
}) => Promise<never>;
export {};
//# sourceMappingURL=partners.service.d.ts.map
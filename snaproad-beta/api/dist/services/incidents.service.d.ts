interface CreateIncidentData {
    userId: string;
    incidentType: 'accident' | 'hazard' | 'violation' | 'other';
    description?: string;
    location: {
        lat: number;
        lng: number;
    };
}
interface NearbyQuery {
    latitude: number;
    longitude: number;
    radiusKm: number;
}
export declare const createIncident: (data: CreateIncidentData) => Promise<never>;
export declare const uploadAndBlurPhotos: (incidentId: string, files: Express.Multer.File[]) => Promise<never>;
export declare const getIncidents: (options: {
    page: number;
    limit: number;
    type?: string;
    status?: string;
}) => Promise<never>;
export declare const getNearbyIncidents: (query: NearbyQuery) => Promise<never>;
export declare const getIncidentById: (incidentId: string) => Promise<never>;
export declare const deleteIncident: (incidentId: string, userId: string) => Promise<never>;
export {};
//# sourceMappingURL=incidents.service.d.ts.map
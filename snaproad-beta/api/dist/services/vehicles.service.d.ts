interface CreateVehicleData {
    userId: string;
    make: string;
    model: string;
    year: number;
    fuelType: 'gas' | 'diesel' | 'electric' | 'hybrid';
    isPrimary?: boolean;
}
export declare const createVehicle: (data: CreateVehicleData) => Promise<never>;
export declare const getUserVehicles: (userId: string) => Promise<never>;
export declare const getVehicleById: (vehicleId: string, userId: string) => Promise<never>;
export declare const updateVehicle: (vehicleId: string, userId: string, data: Partial<CreateVehicleData>) => Promise<never>;
export declare const deleteVehicle: (vehicleId: string, userId: string) => Promise<never>;
export declare const setPrimaryVehicle: (vehicleId: string, userId: string) => Promise<never>;
export {};
//# sourceMappingURL=vehicles.service.d.ts.map
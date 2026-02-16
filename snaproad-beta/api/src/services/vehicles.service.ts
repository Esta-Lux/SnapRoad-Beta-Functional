// Vehicles Service - Placeholder implementations

interface CreateVehicleData {
  userId: string;
  make: string;
  model: string;
  year: number;
  fuelType: 'gas' | 'diesel' | 'electric' | 'hybrid';
  isPrimary?: boolean;
}

export const createVehicle = async (data: CreateVehicleData) => {
  // TODO: Create vehicle record
  // If isPrimary, unset other vehicles' primary flag
  throw new Error('Not implemented');
};

export const getUserVehicles = async (userId: string) => {
  // TODO: Fetch user's vehicles
  throw new Error('Not implemented');
};

export const getVehicleById = async (vehicleId: string, userId: string) => {
  // TODO: Fetch vehicle details
  throw new Error('Not implemented');
};

export const updateVehicle = async (
  vehicleId: string,
  userId: string,
  data: Partial<CreateVehicleData>
) => {
  // TODO: Update vehicle
  throw new Error('Not implemented');
};

export const deleteVehicle = async (vehicleId: string, userId: string) => {
  // TODO: Delete vehicle
  throw new Error('Not implemented');
};

export const setPrimaryVehicle = async (vehicleId: string, userId: string) => {
  // TODO: Set as primary, unset others
  throw new Error('Not implemented');
};

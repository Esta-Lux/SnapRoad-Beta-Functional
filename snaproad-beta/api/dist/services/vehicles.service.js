"use strict";
// Vehicles Service - Placeholder implementations
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPrimaryVehicle = exports.deleteVehicle = exports.updateVehicle = exports.getVehicleById = exports.getUserVehicles = exports.createVehicle = void 0;
const createVehicle = async (data) => {
    // TODO: Create vehicle record
    // If isPrimary, unset other vehicles' primary flag
    throw new Error('Not implemented');
};
exports.createVehicle = createVehicle;
const getUserVehicles = async (userId) => {
    // TODO: Fetch user's vehicles
    throw new Error('Not implemented');
};
exports.getUserVehicles = getUserVehicles;
const getVehicleById = async (vehicleId, userId) => {
    // TODO: Fetch vehicle details
    throw new Error('Not implemented');
};
exports.getVehicleById = getVehicleById;
const updateVehicle = async (vehicleId, userId, data) => {
    // TODO: Update vehicle
    throw new Error('Not implemented');
};
exports.updateVehicle = updateVehicle;
const deleteVehicle = async (vehicleId, userId) => {
    // TODO: Delete vehicle
    throw new Error('Not implemented');
};
exports.deleteVehicle = deleteVehicle;
const setPrimaryVehicle = async (vehicleId, userId) => {
    // TODO: Set as primary, unset others
    throw new Error('Not implemented');
};
exports.setPrimaryVehicle = setPrimaryVehicle;
//# sourceMappingURL=vehicles.service.js.map
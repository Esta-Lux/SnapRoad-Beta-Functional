"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPrimaryVehicle = exports.deleteVehicle = exports.updateVehicle = exports.getVehicleDetails = exports.getVehicles = exports.createVehicle = void 0;
const vehiclesService = __importStar(require("../services/vehicles.service"));
const response_1 = require("../utils/response");
/**
 * Create vehicle
 */
const createVehicle = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { make, model, year, fuelType, isPrimary } = req.body;
        const vehicle = await vehiclesService.createVehicle({
            userId,
            make,
            model,
            year,
            fuelType,
            isPrimary
        });
        return response_1.ApiResponse.created(res, vehicle, 'Vehicle added');
    }
    catch (error) {
        next(error);
    }
};
exports.createVehicle = createVehicle;
/**
 * Get user vehicles
 */
const getVehicles = async (req, res, next) => {
    try {
        const userId = req.userId;
        const vehicles = await vehiclesService.getUserVehicles(userId);
        return response_1.ApiResponse.success(res, vehicles);
    }
    catch (error) {
        next(error);
    }
};
exports.getVehicles = getVehicles;
/**
 * Get vehicle details
 */
const getVehicleDetails = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const vehicle = await vehiclesService.getVehicleById(id, userId);
        return response_1.ApiResponse.success(res, vehicle);
    }
    catch (error) {
        next(error);
    }
};
exports.getVehicleDetails = getVehicleDetails;
/**
 * Update vehicle
 */
const updateVehicle = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const updateData = req.body;
        const vehicle = await vehiclesService.updateVehicle(id, userId, updateData);
        return response_1.ApiResponse.success(res, vehicle, 'Vehicle updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateVehicle = updateVehicle;
/**
 * Delete vehicle
 */
const deleteVehicle = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        await vehiclesService.deleteVehicle(id, userId);
        return response_1.ApiResponse.success(res, null, 'Vehicle deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteVehicle = deleteVehicle;
/**
 * Set primary vehicle
 */
const setPrimaryVehicle = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const vehicle = await vehiclesService.setPrimaryVehicle(id, userId);
        return response_1.ApiResponse.success(res, vehicle, 'Primary vehicle updated');
    }
    catch (error) {
        next(error);
    }
};
exports.setPrimaryVehicle = setPrimaryVehicle;
//# sourceMappingURL=vehicles.controller.js.map
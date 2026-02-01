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
const express_1 = require("express");
const vehiclesController = __importStar(require("../controllers/vehicles.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const vehicles_validators_1 = require("../validators/vehicles.validators");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route   POST /api/v1/vehicles
 * @desc    Add a new vehicle
 * @access  Private
 */
router.post('/', (0, validation_middleware_1.validateRequest)(vehicles_validators_1.createVehicleSchema), vehiclesController.createVehicle);
/**
 * @route   GET /api/v1/vehicles
 * @desc    Get user's vehicles
 * @access  Private
 */
router.get('/', vehiclesController.getVehicles);
/**
 * @route   GET /api/v1/vehicles/:id
 * @desc    Get vehicle details
 * @access  Private
 */
router.get('/:id', vehiclesController.getVehicleDetails);
/**
 * @route   PUT /api/v1/vehicles/:id
 * @desc    Update vehicle
 * @access  Private
 */
router.put('/:id', (0, validation_middleware_1.validateRequest)(vehicles_validators_1.updateVehicleSchema), vehiclesController.updateVehicle);
/**
 * @route   DELETE /api/v1/vehicles/:id
 * @desc    Delete vehicle
 * @access  Private
 */
router.delete('/:id', vehiclesController.deleteVehicle);
/**
 * @route   PATCH /api/v1/vehicles/:id/primary
 * @desc    Set vehicle as primary
 * @access  Private
 */
router.patch('/:id/primary', vehiclesController.setPrimaryVehicle);
exports.default = router;
//# sourceMappingURL=vehicles.routes.js.map
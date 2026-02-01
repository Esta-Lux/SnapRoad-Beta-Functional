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
const tripsController = __importStar(require("../controllers/trips.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const trips_validators_1 = require("../validators/trips.validators");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route   POST /api/v1/trips/start
 * @desc    Start a new trip
 * @access  Private
 */
router.post('/start', (0, validation_middleware_1.validateRequest)(trips_validators_1.startTripSchema), tripsController.startTrip);
/**
 * @route   POST /api/v1/trips/:id/end
 * @desc    End a trip with summary
 * @access  Private
 */
router.post('/:id/end', (0, validation_middleware_1.validateRequest)(trips_validators_1.endTripSchema), tripsController.endTrip);
/**
 * @route   GET /api/v1/trips
 * @desc    Get user trip history
 * @access  Private
 */
router.get('/', tripsController.getTripHistory);
/**
 * @route   GET /api/v1/trips/:id
 * @desc    Get trip details
 * @access  Private
 */
router.get('/:id', tripsController.getTripDetails);
/**
 * @route   POST /api/v1/trips/:id/events
 * @desc    Log driving events (speeding, hard brake, etc.)
 * @access  Private
 */
router.post('/:id/events', (0, validation_middleware_1.validateRequest)(trips_validators_1.tripEventSchema), tripsController.logTripEvent);
/**
 * @route   GET /api/v1/trips/:id/events
 * @desc    Get all events for a trip
 * @access  Private
 */
router.get('/:id/events', tripsController.getTripEvents);
/**
 * @route   GET /api/v1/trips/active
 * @desc    Get user's active trip if any
 * @access  Private
 */
router.get('/status/active', tripsController.getActiveTrip);
exports.default = router;
//# sourceMappingURL=trips.routes.js.map
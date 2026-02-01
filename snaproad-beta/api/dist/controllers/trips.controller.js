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
exports.getActiveTrip = exports.getTripEvents = exports.logTripEvent = exports.getTripDetails = exports.getTripHistory = exports.endTrip = exports.startTrip = void 0;
const tripsService = __importStar(require("../services/trips.service"));
const response_1 = require("../utils/response");
/**
 * Start a new trip
 */
const startTrip = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { vehicleId, startLocation, destination } = req.body;
        // TODO: Implement trip start logic
        // - Create trip record
        // - Get optimized route from Mapbox
        // - Initialize real-time tracking
        const trip = await tripsService.startNewTrip({
            userId,
            vehicleId,
            startLocation,
            destination
        });
        return response_1.ApiResponse.created(res, trip, 'Trip started');
    }
    catch (error) {
        next(error);
    }
};
exports.startTrip = startTrip;
/**
 * End a trip
 */
const endTrip = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { endLocation, routeGeometry } = req.body;
        // TODO: Implement trip end logic
        // - Calculate driving score
        // - Calculate fuel savings
        // - Award Gems
        const tripSummary = await tripsService.endTrip({
            tripId: id,
            userId,
            endLocation,
            routeGeometry
        });
        return response_1.ApiResponse.success(res, tripSummary, 'Trip completed');
    }
    catch (error) {
        next(error);
    }
};
exports.endTrip = endTrip;
/**
 * Get trip history
 */
const getTripHistory = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;
        const trips = await tripsService.getUserTrips(userId, {
            page: Number(page),
            limit: Number(limit)
        });
        return response_1.ApiResponse.success(res, trips);
    }
    catch (error) {
        next(error);
    }
};
exports.getTripHistory = getTripHistory;
/**
 * Get trip details
 */
const getTripDetails = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const trip = await tripsService.getTripById(id, userId);
        return response_1.ApiResponse.success(res, trip);
    }
    catch (error) {
        next(error);
    }
};
exports.getTripDetails = getTripDetails;
/**
 * Log driving event
 */
const logTripEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { eventType, severity, location, speedKmh } = req.body;
        // TODO: Implement event logging
        // Event types: speeding, hard_brake, rapid_acceleration
        const event = await tripsService.logDrivingEvent({
            tripId: id,
            eventType,
            severity,
            location,
            speedKmh
        });
        return response_1.ApiResponse.created(res, event, 'Event logged');
    }
    catch (error) {
        next(error);
    }
};
exports.logTripEvent = logTripEvent;
/**
 * Get trip events
 */
const getTripEvents = async (req, res, next) => {
    try {
        const { id } = req.params;
        const events = await tripsService.getTripEvents(id);
        return response_1.ApiResponse.success(res, events);
    }
    catch (error) {
        next(error);
    }
};
exports.getTripEvents = getTripEvents;
/**
 * Get active trip
 */
const getActiveTrip = async (req, res, next) => {
    try {
        const userId = req.userId;
        const activeTrip = await tripsService.getActiveTrip(userId);
        return response_1.ApiResponse.success(res, activeTrip);
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveTrip = getActiveTrip;
//# sourceMappingURL=trips.controller.js.map
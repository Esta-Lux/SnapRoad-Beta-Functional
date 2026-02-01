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
exports.deleteIncident = exports.getIncidentDetails = exports.getNearbyIncidents = exports.getIncidents = exports.uploadIncidentPhotos = exports.createIncident = void 0;
const incidentsService = __importStar(require("../services/incidents.service"));
const response_1 = require("../utils/response");
/**
 * Create incident report
 */
const createIncident = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { incidentType, description, location } = req.body;
        // TODO: Implement incident creation
        const incident = await incidentsService.createIncident({
            userId,
            incidentType,
            description,
            location
        });
        return response_1.ApiResponse.created(res, incident, 'Incident reported');
    }
    catch (error) {
        next(error);
    }
};
exports.createIncident = createIncident;
/**
 * Upload incident photos (with auto-blur)
 */
const uploadIncidentPhotos = async (req, res, next) => {
    try {
        const { id } = req.params;
        const files = req.files;
        // TODO: Implement photo upload with auto-blur
        // - Upload to S3
        // - Run AWS Rekognition for face/plate detection
        // - Apply blur using Sharp.js
        // - Save blurred version
        const photos = await incidentsService.uploadAndBlurPhotos(id, files);
        return response_1.ApiResponse.created(res, photos, 'Photos uploaded and processed');
    }
    catch (error) {
        next(error);
    }
};
exports.uploadIncidentPhotos = uploadIncidentPhotos;
/**
 * Get incidents with geofencing
 */
const getIncidents = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, status } = req.query;
        const incidents = await incidentsService.getIncidents({
            page: Number(page),
            limit: Number(limit),
            type: type,
            status: status
        });
        return response_1.ApiResponse.success(res, incidents);
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidents = getIncidents;
/**
 * Get nearby incidents
 */
const getNearbyIncidents = async (req, res, next) => {
    try {
        const { lat, lng, radiusKm = 10 } = req.query;
        // TODO: Implement geospatial query
        const incidents = await incidentsService.getNearbyIncidents({
            latitude: Number(lat),
            longitude: Number(lng),
            radiusKm: Number(radiusKm)
        });
        return response_1.ApiResponse.success(res, incidents);
    }
    catch (error) {
        next(error);
    }
};
exports.getNearbyIncidents = getNearbyIncidents;
/**
 * Get incident details
 */
const getIncidentDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const incident = await incidentsService.getIncidentById(id);
        return response_1.ApiResponse.success(res, incident);
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidentDetails = getIncidentDetails;
/**
 * Delete incident
 */
const deleteIncident = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        await incidentsService.deleteIncident(id, userId);
        return response_1.ApiResponse.success(res, null, 'Incident deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteIncident = deleteIncident;
//# sourceMappingURL=incidents.controller.js.map
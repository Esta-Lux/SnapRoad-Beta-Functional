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
const incidentsController = __importStar(require("../controllers/incidents.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const incidents_validators_1 = require("../validators/incidents.validators");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route   POST /api/v1/incidents
 * @desc    Create a new incident report
 * @access  Private
 */
router.post('/', (0, validation_middleware_1.validateRequest)(incidents_validators_1.createIncidentSchema), incidentsController.createIncident);
/**
 * @route   POST /api/v1/incidents/:id/photos
 * @desc    Upload photos for an incident (with auto-blur)
 * @access  Private
 */
router.post('/:id/photos', upload_middleware_1.uploadMiddleware.array('photos', 5), incidentsController.uploadIncidentPhotos);
/**
 * @route   GET /api/v1/incidents
 * @desc    Get incidents (with geofencing)
 * @access  Private
 */
router.get('/', incidentsController.getIncidents);
/**
 * @route   GET /api/v1/incidents/nearby
 * @desc    Get incidents near a location
 * @access  Private
 */
router.get('/nearby', incidentsController.getNearbyIncidents);
/**
 * @route   GET /api/v1/incidents/:id
 * @desc    Get incident details
 * @access  Private
 */
router.get('/:id', incidentsController.getIncidentDetails);
/**
 * @route   DELETE /api/v1/incidents/:id
 * @desc    Delete own incident report
 * @access  Private
 */
router.delete('/:id', incidentsController.deleteIncident);
exports.default = router;
//# sourceMappingURL=incidents.routes.js.map
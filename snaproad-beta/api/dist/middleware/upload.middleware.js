"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFileName = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Accept images only
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.'));
    }
};
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 5 // Max 5 files per upload
    }
});
/**
 * Generate unique filename for uploads
 */
const generateFileName = (originalName) => {
    const ext = path_1.default.extname(originalName);
    return `${(0, uuid_1.v4)()}${ext}`;
};
exports.generateFileName = generateFileName;
//# sourceMappingURL=upload.middleware.js.map
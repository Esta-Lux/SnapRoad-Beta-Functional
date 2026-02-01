"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageMetadata = exports.convertToJpeg = exports.resizeForProcessing = exports.blurRegions = void 0;
// Blur Service - Sharp.js image processing
const sharp_1 = __importDefault(require("sharp"));
/**
 * Apply blur to multiple regions of an image
 */
const blurRegions = async (imageBuffer, boundingBoxes) => {
    const image = (0, sharp_1.default)(imageBuffer);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
    }
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    // Convert percentage bounding boxes to pixels
    const pixelRegions = boundingBoxes.map(box => ({
        left: Math.floor(box.left * imageWidth),
        top: Math.floor(box.top * imageHeight),
        width: Math.floor(box.width * imageWidth),
        height: Math.floor(box.height * imageHeight)
    }));
    // Apply blur to each region
    const composites = [];
    for (const region of pixelRegions) {
        // Skip invalid regions
        if (region.width <= 0 || region.height <= 0)
            continue;
        if (region.left + region.width > imageWidth)
            continue;
        if (region.top + region.height > imageHeight)
            continue;
        const blurredRegion = await (0, sharp_1.default)(imageBuffer)
            .extract({
            left: region.left,
            top: region.top,
            width: region.width,
            height: region.height
        })
            .blur(50) // Strong blur
            .toBuffer();
        composites.push({
            input: blurredRegion,
            left: region.left,
            top: region.top
        });
    }
    // Composite blurred regions back onto original
    if (composites.length > 0) {
        return image.composite(composites).toBuffer();
    }
    return imageBuffer;
};
exports.blurRegions = blurRegions;
/**
 * Resize image for processing (to reduce Rekognition costs)
 */
const resizeForProcessing = async (imageBuffer, maxDimension = 1920) => {
    return (0, sharp_1.default)(imageBuffer)
        .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
    })
        .toBuffer();
};
exports.resizeForProcessing = resizeForProcessing;
/**
 * Convert image to JPEG for consistent processing
 */
const convertToJpeg = async (imageBuffer, quality = 85) => {
    return (0, sharp_1.default)(imageBuffer)
        .jpeg({ quality })
        .toBuffer();
};
exports.convertToJpeg = convertToJpeg;
/**
 * Get image metadata
 */
const getImageMetadata = async (imageBuffer) => {
    return (0, sharp_1.default)(imageBuffer).metadata();
};
exports.getImageMetadata = getImageMetadata;
//# sourceMappingURL=blur.service.js.map
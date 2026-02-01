import sharp from 'sharp';
interface BoundingBox {
    left: number;
    top: number;
    width: number;
    height: number;
}
/**
 * Apply blur to multiple regions of an image
 */
export declare const blurRegions: (imageBuffer: Buffer, boundingBoxes: BoundingBox[]) => Promise<Buffer>;
/**
 * Resize image for processing (to reduce Rekognition costs)
 */
export declare const resizeForProcessing: (imageBuffer: Buffer, maxDimension?: number) => Promise<Buffer>;
/**
 * Convert image to JPEG for consistent processing
 */
export declare const convertToJpeg: (imageBuffer: Buffer, quality?: number) => Promise<Buffer>;
/**
 * Get image metadata
 */
export declare const getImageMetadata: (imageBuffer: Buffer) => Promise<sharp.Metadata>;
export {};
//# sourceMappingURL=blur.service.d.ts.map
interface BlurResult {
    blurredUrl: string;
    originalUrl: string;
    facesDetected: number;
    platesDetected: number;
}
/**
 * Detect faces in an image using AWS Rekognition
 */
export declare const detectFaces: (imageBuffer: Buffer) => Promise<never>;
/**
 * Detect text (including license plates) in an image
 */
export declare const detectText: (imageBuffer: Buffer) => Promise<never>;
/**
 * Apply blur to specific regions of an image
 */
export declare const applyBlur: (imageBuffer: Buffer, regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
}>) => Promise<never>;
/**
 * Full auto-blur pipeline
 * 1. Upload original to S3
 * 2. Detect faces and license plates
 * 3. Apply blur to detected regions
 * 4. Upload blurred version to S3
 */
export declare const processAndBlurImage: (imageBuffer: Buffer, imageKey: string) => Promise<BlurResult>;
/**
 * Upload image to S3
 */
export declare const uploadToS3: (buffer: Buffer, key: string, contentType?: string) => Promise<never>;
/**
 * Generate pre-signed URL for S3 object
 */
export declare const getSignedUrl: (key: string, expiresIn?: number) => Promise<never>;
export {};
//# sourceMappingURL=rekognition.service.d.ts.map
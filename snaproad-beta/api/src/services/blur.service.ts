// Blur Service - Sharp.js image processing
import sharp from 'sharp';

interface BoundingBox {
  left: number;    // 0-1 percentage
  top: number;     // 0-1 percentage
  width: number;   // 0-1 percentage
  height: number;  // 0-1 percentage
}

/**
 * Apply blur to multiple regions of an image
 */
export const blurRegions = async (
  imageBuffer: Buffer,
  boundingBoxes: BoundingBox[]
): Promise<Buffer> => {
  const image = sharp(imageBuffer);
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
  const composites: sharp.OverlayOptions[] = [];
  
  for (const region of pixelRegions) {
    // Skip invalid regions
    if (region.width <= 0 || region.height <= 0) continue;
    if (region.left + region.width > imageWidth) continue;
    if (region.top + region.height > imageHeight) continue;
    
    const blurredRegion = await sharp(imageBuffer)
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

/**
 * Resize image for processing (to reduce Rekognition costs)
 */
export const resizeForProcessing = async (
  imageBuffer: Buffer,
  maxDimension: number = 1920
): Promise<Buffer> => {
  return sharp(imageBuffer)
    .resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .toBuffer();
};

/**
 * Convert image to JPEG for consistent processing
 */
export const convertToJpeg = async (
  imageBuffer: Buffer,
  quality: number = 85
): Promise<Buffer> => {
  return sharp(imageBuffer)
    .jpeg({ quality })
    .toBuffer();
};

/**
 * Get image metadata
 */
export const getImageMetadata = async (imageBuffer: Buffer) => {
  return sharp(imageBuffer).metadata();
};

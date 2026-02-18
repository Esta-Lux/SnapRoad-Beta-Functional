# SnapRoad - Photo Analysis Service with Privacy Blur
# AI-powered face and license plate detection for privacy protection

import os
import base64
import json
import re
from datetime import datetime
from typing import Optional, List
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

# System prompt for privacy detection
PRIVACY_DETECTION_PROMPT = """You are a privacy detection AI. Analyze the provided image and identify any elements that should be blurred for privacy protection.

Your task:
1. Detect all human faces in the image
2. Detect all license plates (car tags) in the image
3. Return the bounding box coordinates for each detection

IMPORTANT: Return ONLY a valid JSON response with no additional text. The format must be:

{
  "faces": [
    {"x": 100, "y": 50, "width": 80, "height": 100, "confidence": 0.95}
  ],
  "license_plates": [
    {"x": 200, "y": 300, "width": 120, "height": 40, "confidence": 0.92}
  ],
  "description": "Brief description of what's in the image"
}

Coordinates are in pixels from top-left corner.
- x: horizontal position from left edge
- y: vertical position from top edge  
- width: width of bounding box
- height: height of bounding box
- confidence: detection confidence (0.0 to 1.0)

If no faces or plates are detected, return empty arrays.
Always include all three fields: faces, license_plates, description.
"""

class PhotoAnalysisService:
    """Service for analyzing photos and detecting faces/license plates for privacy blur"""
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    async def analyze_image(self, image_base64: str, image_type: str = "image/jpeg") -> dict:
        """
        Analyze an image and detect faces and license plates.
        
        Args:
            image_base64: Base64 encoded image string
            image_type: MIME type of the image (default: image/jpeg)
            
        Returns:
            dict with faces, license_plates arrays and description
        """
        try:
            if not self.api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            # Create a new chat instance for each analysis
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"photo_analysis_{datetime.now().timestamp()}",
                system_message=PRIVACY_DETECTION_PROMPT
            ).with_model("openai", "gpt-5.2")
            
            # Create image content
            image_content = ImageContent(image_base64=image_base64)
            
            # Create message with image
            user_message = UserMessage(
                text="Analyze this image and identify all faces and license plates that need privacy blurring. Return coordinates as JSON.",
                file_contents=[image_content]
            )
            
            # Get response
            response = await chat.send_message(user_message)
            
            # Parse the JSON response
            try:
                # Try to extract JSON from the response
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    # If no JSON found, return empty detections
                    result = {
                        "faces": [],
                        "license_plates": [],
                        "description": response
                    }
            except json.JSONDecodeError:
                # If JSON parsing fails, return empty detections with the response as description
                result = {
                    "faces": [],
                    "license_plates": [],
                    "description": response
                }
            
            # Ensure required fields exist
            result.setdefault("faces", [])
            result.setdefault("license_plates", [])
            result.setdefault("description", "Image analyzed")
            
            return {
                "success": True,
                "detections": result,
                "total_faces": len(result["faces"]),
                "total_plates": len(result["license_plates"]),
                "needs_blur": len(result["faces"]) > 0 or len(result["license_plates"]) > 0
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "detections": {
                    "faces": [],
                    "license_plates": [],
                    "description": "Analysis failed"
                },
                "total_faces": 0,
                "total_plates": 0,
                "needs_blur": False
            }
    
    def generate_blur_mask(self, detections: dict, image_width: int, image_height: int) -> List[dict]:
        """
        Generate blur mask regions from detections.
        Returns regions that can be used by frontend to apply blur.
        """
        blur_regions = []
        
        # Add face regions with extra padding
        for i, face in enumerate(detections.get("faces", [])):
            padding = 10  # Extra padding around face
            blur_regions.append({
                "id": f"face_{i}",
                "type": "face",
                "x": max(0, face["x"] - padding),
                "y": max(0, face["y"] - padding),
                "width": min(image_width, face["width"] + padding * 2),
                "height": min(image_height, face["height"] + padding * 2),
                "confidence": face.get("confidence", 0.9),
                "blur_intensity": 20  # Blur radius in pixels
            })
        
        # Add license plate regions
        for i, plate in enumerate(detections.get("license_plates", [])):
            padding = 5
            blur_regions.append({
                "id": f"plate_{i}",
                "type": "license_plate",
                "x": max(0, plate["x"] - padding),
                "y": max(0, plate["y"] - padding),
                "width": min(image_width, plate["width"] + padding * 2),
                "height": min(image_height, plate["height"] + padding * 2),
                "confidence": plate.get("confidence", 0.9),
                "blur_intensity": 25  # Stronger blur for plates
            })
        
        return blur_regions

# Create singleton instance
photo_service = PhotoAnalysisService()

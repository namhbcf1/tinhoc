/**
 * CCCD Detector & Cropper using Cloudflare Workers AI
 *
 * Logic:
 * 1. Load image from URL
 * 2. Run object detection (DETR)
 * 3. Find CCCD bounding box
 * 4. Crop using perspective transform
 * 5. Return processed image
 */
export async function detectAndCropCCCD(env, imageUrl) {
    try {
        // 1. Fetch image
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        // 2. Run Object Detection
        // Using simple object detection model first
        const inputs = {
            image: [...new Uint8Array(imageBuffer)]
        };
        // Note: We need to bind AI in wrangler.toml first:
        // [ai]
        // binding = "AI"
        if (!env.AI) {
            throw new Error('Workers AI binding not found');
        }
        const aiResult = await env.AI.run('@cf/meta/detr-resnet-50', inputs);
        // 3. Find CCCD/Card in results
        // DETR returns: { box: { xmin, ymin, xmax, ymax }, score, label }
        // We look for 'book' or generic rectangle if 'id card' not available,
        // effectively we might need a custom model or fine-tuning later.
        // For now, let's assume the largest detected object is the card.
        // Sort by confidence
        const detections = aiResult.sort((a, b) => b.score - a.score);
        // Filter for reasonably sized objects (e.g., > 10% of image area)
        // and confidence > 0.8
        const bestDetection = detections.find((d) => d.score > 0.8);
        if (!bestDetection) {
            return {
                success: false,
                reason: 'No object detected with high confidence',
                originalDetections: detections.slice(0, 3)
            };
        }
        // 4. Return bbox for cropping (Processing happens in another step or using Image Resizing)
        // Cloudflare Images can crop via URL!
        // We just return the crop coordinates to client/backend.
        return {
            success: true,
            box: bestDetection.box,
            score: bestDetection.score,
            details: 'Detected object, pending crop implementation'
        };
    }
    catch (error) {
        console.error('AI Detection Error:', error);
        return { success: false, error: error.message };
    }
}

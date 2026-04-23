import base64
import io
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO

app = FastAPI(title="YOLOv8 Object Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model: Optional[YOLO] = None

class DetectionResult(BaseModel):
    label: str
    confidence: float

class DetectionRequest(BaseModel):
    image: str

class DetectionResponse(BaseModel):
    objects: list[DetectionResult]

@app.on_event("startup")
async def load_model():
    global model
    try:
        model = YOLO("yolov8n.pt")
    except Exception as e:
        print(f"Warning: Could not load YOLOv8 model: {e}")
        model = None

@app.get("/health")
async def health_check():
    return {"ok": model is not None}

@app.post("/detect-objects", response_model=DetectionResponse)
async def detect_objects(request: DetectionRequest):
    if model is None:
        raise HTTPException(status=503, detail="Model not loaded")

    try:
        if "," in request.image:
            header, b64_data = request.image.split(",", 1)
        else:
            b64_data = request.image

        image_data = base64.b64decode(b64_data)
        image = Image.open(io.BytesIO(image_data))

        if image.mode != "RGB":
            image = image.convert("RGB")

        results = model(image, verbose=False)[0]

        detected_objects = []
        if results.boxes is not None:
            boxes = results.boxes
            for i in range(len(boxes)):
                class_id = int(boxes.cls[i].item())
                confidence = float(boxes.conf[i].item())
                label = model.names[class_id]
                detected_objects.append(DetectionResult(
                    label=label,
                    confidence=round(confidence, 2)
                ))

        detected_objects.sort(key=lambda x: x.confidence, reverse=True)

        return DetectionResponse(objects=detected_objects)

    except Exception as e:
        raise HTTPException(status=400, detail=f"Detection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
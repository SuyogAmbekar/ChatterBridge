from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from tensorflow.keras.models import load_model # type: ignore
from PIL import Image
import io
import tempfile
import os

app = FastAPI()

# Load your trained model
model = load_model("model/sign_model.h5")  # update path to your model
class_names = ["Hello", "Thank you", "Yes", "No", "I Love You"]  # update with your labels


@app.post("/detect-sign")
async def detect_sign(file: UploadFile = File(...)):
    """
    Detects sign from image
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((64, 64))  # same size used in training
        img_array = np.array(image) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        predictions = model.predict(img_array)
        index = int(np.argmax(predictions[0]))
        confidence = float(np.max(predictions[0]))

        return JSONResponse({
            "label": class_names[index],
            "confidence": confidence
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/detect-video")
async def detect_video(file: UploadFile = File(...)):
    """
    Detects sign from video by sampling frames
    """
    try:
        # Save video temporarily
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        tmp.write(await file.read())
        tmp.close()

        cap = cv2.VideoCapture(tmp.name)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        predictions_list = []
        sample_rate = 5  # take every 5th frame

        for i in range(0, frame_count, sample_rate):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                continue

            # Preprocess frame
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = cv2.resize(frame, (64, 64))
            img_array = np.array(frame) / 255.0
            img_array = np.expand_dims(img_array, axis=0)

            preds = model.predict(img_array)
            index = int(np.argmax(preds[0]))
            confidence = float(np.max(preds[0]))
            predictions_list.append((class_names[index], confidence))

        cap.release()
        os.unlink(tmp.name)

        if not predictions_list:
            return JSONResponse({"error": "No frames processed"}, status_code=400)

        # Find most frequent prediction
        labels = [p[0] for p in predictions_list]
        final_label = max(set(labels), key=labels.count)
        avg_conf = float(np.mean([p[1] for p in predictions_list if p[0] == final_label]))

        return JSONResponse({
            "label": final_label,
            "confidence": avg_conf
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

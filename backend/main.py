from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from tensorflow.keras.models import load_model # type: ignore
import json
import tempfile
import os
import tensorflow as tf

app = FastAPI()

# Load trained LSTM model and labels
MODEL_PATH = "sign_model_weights.keras"
model = load_model(MODEL_PATH)

with open("labels.json", "r") as f:
    class_names = json.load(f)

IMG_SIZE = 128
MAX_FRAMES = 5

# Base MobileNetV2 for feature extraction
base_model = tf.keras.applications.MobileNetV2(input_shape=(IMG_SIZE, IMG_SIZE, 3),
                                               include_top=False,
                                               pooling='avg',
                                               weights='imagenet')
base_model.trainable = False

def preprocess_frame(frame):
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
    frame = frame.astype("float32") / 255.0
    return frame

def sample_frames(video_path, max_frames=MAX_FRAMES):
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frames = []
    if total_frames == 0:
        cap.release()
        return [np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)]
    step = max(1, total_frames // max_frames)
    for i in range(0, total_frames, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            continue
        frames.append(preprocess_frame(frame))
        if len(frames) >= max_frames:
            break
    cap.release()
    return frames

def pad_features(features, max_frames=MAX_FRAMES):
    n = len(features)
    feature_dim = features[0].shape[0]
    if n < max_frames:
        pad = np.repeat(features[-1][np.newaxis, :], max_frames - n, axis=0)
        features = np.vstack([features, pad])
    else:
        features = np.array(features[:max_frames])
    return features

@app.post("/detect-video")
async def detect_video(file: UploadFile = File(...)):
    try:
        # Save uploaded video temporarily
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        tmp.write(await file.read())
        tmp.close()

        frames = sample_frames(tmp.name)
        features = [base_model.predict(np.expand_dims(f, axis=0), verbose=0)[0] for f in frames]
        features = pad_features(features)
        features = np.expand_dims(features, axis=0)  # batch dimension

        pred = model.predict(features, verbose=0)
        index = int(np.argmax(pred[0]))
        confidence = float(np.max(pred[0]))

        os.unlink(tmp.name)

        return JSONResponse({
            "label": class_names[index],
            "confidence": confidence
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

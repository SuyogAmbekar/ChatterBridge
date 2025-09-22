import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models # type: ignore
from tensorflow.keras.callbacks import EarlyStopping # type: ignore
from sklearn.model_selection import train_test_split
import json
from tensorflow.keras.applications import MobileNetV2 # type: ignore

IMG_SIZE = 128
MAX_FRAMES = 10  # sample more frames per video
AUGMENT = True

# MobileNetV2 as feature extractor
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    pooling='avg',
    weights='imagenet'
)
base_model.trainable = False

def preprocess_frame(frame, augment=AUGMENT):
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
    frame = frame.astype("float32") / 255.0
    if augment:
        frame = tf.image.random_flip_left_right(frame)
        frame = tf.image.random_brightness(frame, 0.2)
        frame = tf.image.random_contrast(frame, 0.8, 1.2)
    return frame.numpy()

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

# Load dataset
video_dir = "video"
class_folders = [f for f in os.listdir(video_dir) if os.path.isdir(os.path.join(video_dir, f))]
X, y = [], []
class_names = []

for idx, folder in enumerate(class_folders):
    folder_path = os.path.join(video_dir, folder)
    videos = [f for f in os.listdir(folder_path) if f.endswith(".mp4")]
    if not videos:
        continue
    class_names.append(folder)
    for vid in videos:
        path = os.path.join(folder_path, vid)
        frames = sample_frames(path)
        features = [base_model.predict(np.expand_dims(f, axis=0), verbose=0)[0] for f in frames]
        features = pad_features(features)
        X.append(features)
        y.append(idx)

X = np.array(X)  # shape (num_videos, MAX_FRAMES, feature_dim)
y = np.array(y)

# Train/test split
from sklearn.model_selection import train_test_split
if len(class_names) > 1:
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
else:
    X_train, X_val, y_train, y_val = X, X, y, y  # fallback for single class

# LSTM model
feature_dim = X.shape[2]
model = models.Sequential([
    layers.Input(shape=(MAX_FRAMES, feature_dim)),
    layers.LSTM(128, return_sequences=True, dropout=0.3, recurrent_dropout=0.2),
    layers.LSTM(64, dropout=0.3, recurrent_dropout=0.2),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(len(class_names), activation='softmax')
])

model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

model.fit(X_train, y_train, validation_data=(X_val, y_val),
          epochs=50, batch_size=2, callbacks=[early_stop])

# Save model and labels
model.save("sign_model_weights.keras")
with open("labels.json", "w") as f:
    json.dump(class_names, f)

print(f"Training complete. Classes: {class_names}")
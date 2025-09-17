import tensorflow as tf
from tensorflow.keras import layers, models # type: ignore
import pandas as pd
import numpy as np
import cv2
import json
from sklearn.model_selection import train_test_split

IMG_SIZE = 128
MAX_FRAMES = 30

# Load dataset CSV (update path)
CSV_PATH = "ISL_Dictionary_words.csv"
df = pd.read_csv(CSV_PATH)
print(df.columns)

labels = sorted(df["label"].unique())
label_to_idx = {label: i for i, label in enumerate(labels)}

# Save labels to JSON (reuse same as image model)
with open("labels.json", "w") as f:
    json.dump({i: label for label, i in label_to_idx.items()}, f)

def load_video(path, max_frames=MAX_FRAMES):
    cap = cv2.VideoCapture(path)
    frames = []
    while len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.resize(frame, (32, 32)) 
        frame = frame / 255.0
        frames.append(frame)
    cap.release()
    while len(frames) < max_frames:
        frames.append(np.zeros((IMG_SIZE, IMG_SIZE, 3)))
    return np.array(frames)

X, y = [], []
for _, row in df.iterrows():
    frames = load_video(row["video_path"])
    X.append(frames)
    y.append(label_to_idx[row["label"]])

X = np.array(X)
y = np.array(y)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# LSTM over frames
model = models.Sequential([
    layers.TimeDistributed(layers.Conv2D(32, (3,3), activation="relu"), input_shape=(MAX_FRAMES, IMG_SIZE, IMG_SIZE, 3)),
    layers.TimeDistributed(layers.MaxPooling2D(2,2)),
    layers.TimeDistributed(layers.Conv2D(64, (3,3), activation="relu")),
    layers.TimeDistributed(layers.MaxPooling2D(2,2)),
    layers.TimeDistributed(layers.Flatten()),
    layers.LSTM(128),
    layers.Dense(128, activation="relu"),
    layers.Dense(len(labels), activation="softmax")
])

model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
def video_generator(df, batch_size):
    while True:
        for start in range(0, len(df), batch_size):
            batch_df = df[start:start+batch_size]
            X, y = [], []
            for _, row in batch_df.iterrows():
                frames = load_video(row["video_path"])  # load frames on the fly
                X.append(frames)
                y.append(label_to_idx[row["label"]])
            yield np.array(X), np.array(y)


history = model.fit(video_generator(X_train, batch_size=8),
                    steps_per_epoch=len(X_train)//8,
                    epochs=10,
                    validation_data=video_generator(X_test, batch_size=8),
                    validation_steps=len(X_test)//8)

# Save model
model.save("model/video_model.h5")
print("✅ Video model saved at backend/model/video_model.h5")

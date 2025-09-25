import os
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator # type: ignore
from tensorflow.keras.callbacks import EarlyStopping # type: ignore
from sklearn.utils.class_weight import compute_class_weight

# Config
IMG_SIZE = 128
BATCH_SIZE = 16
EPOCHS = 50
IMAGE_DIR = "image"  # root folder containing subfolders per class

# Data augmentation + normalization
datagen = ImageDataGenerator(
    rescale=1.0/255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    validation_split=0.2
)

# Training set
train_gen = datagen.flow_from_directory(
    IMAGE_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode="sparse",
    subset="training"
)

# Validation set
val_gen = datagen.flow_from_directory(
    IMAGE_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode="sparse",
    subset="validation"
)

# Class names
class_names = list(train_gen.class_indices.keys())
print(f"Classes: {class_names}")

# Compute class weights (to handle imbalance)
y_train = train_gen.classes
class_weights = compute_class_weight("balanced", classes=np.unique(y_train), y=y_train)
class_weight_dict = dict(enumerate(class_weights))
print(f"Class weights: {class_weight_dict}")

# Feature extractor (MobileNetV2)
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    pooling="avg",
    weights="imagenet"
)
base_model.trainable = False

# Classifier head
model = models.Sequential([
    base_model,
    layers.Dense(128, activation="relu"),
    layers.Dropout(0.3),
    layers.Dense(len(class_names), activation="softmax")
])

model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])

# Early stopping
early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)

# Train
history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS,
    class_weight=class_weight_dict,
    callbacks=[early_stop]
)

# Save model + labels
model.save("sign_image_model.keras")
with open("labels_image.json", "w") as f:
    json.dump(class_names, f)

print("✅ Image model training complete.")

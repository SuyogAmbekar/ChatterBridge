import React, { useState } from "react";
import { View, Button, Image, Text, StyleSheet, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function SignDetectionOnline() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      alert("Camera permission required");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setImageUri(uri);
      await sendImage(uri);
    }
  };

  const sendImage = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "sign.jpg",
      } as any);

      const response = await fetch("http://<YOUR_SERVER_IP>:8000/detect", {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.log("Error sending image:", err);
      alert("Failed to detect sign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Capture Sign" onPress={pickImage} />
      {loading && <ActivityIndicator size="large" />}
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {result && (
        <Text style={styles.resultText}>
          Sign: {result.label} {"\n"} Confidence: {(result.confidence * 100).toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  image: { width: 250, height: 250, margin: 20 },
  resultText: { fontSize: 20, textAlign: "center" },
});

import { ResizeMode, Video } from "expo-av";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Safe server URL resolver
const getServerUrl = () => {
  const debuggerHost =
    (Constants as any)?.manifest?.debuggerHost ||
    (Constants as any)?.expoConfig?.hostUri;

  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:8000`;
  }

  return process.env.SERVER_URL || "http://192.168.1.33:8000";
};

const SERVER_URL = getServerUrl();

export default function Sign() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ✅ Pick Image
  const pickImage = async (fromGallery = false) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }

    const res = fromGallery
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        })
      : await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });

    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setImageUri(uri);
      setVideoUri(null);
      await sendFile(uri, "image");
    }
  };

  // ✅ Pick Video
  const pickVideo = async (fromGallery = false) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }

    const res = fromGallery
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.7,
        })
      : await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.7,
          videoMaxDuration: 10,
        });

    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setVideoUri(uri);
      setImageUri(null);
      await sendFile(uri, "video");
    }
  };

  // ✅ Send file to backend
  const sendFile = async (uri: string, type: "image" | "video") => {
    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", {
        uri,
        type: type === "image" ? "image/jpeg" : "video/mp4",
        name: type === "image" ? "sign.jpg" : "sign.mp4",
      } as any);

      const response = await fetch(
        `${SERVER_URL}/${type === "image" ? "detect-sign" : "detect-video"}`,
        {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Error sending file:", err);
      Alert.alert("Error", "Failed to detect sign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#1f2937", "#000000"]} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }}>
          {/* Title */}
          <Text className="text-blue-200 font-bold text-3xl m-4 my-6 tracking-wide text-center">
            🖐 Sign Translation
          </Text>

          {/* IMAGE Section */}
          <View className="w-11/12 m-6 bg-gray-800 rounded-2xl border border-gray-900 items-center">
            <Text className="text-white font-bold text-2xl m-4 mt-6">IMAGE</Text>
            <TouchableOpacity
              onPress={() => pickImage(false)}
              className="bg-purple-400 rounded-xl px-5 py-3 mt-4"
            >
              <Text className="text-black font-semibold text-xl">📸 Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickImage(true)}
              className="bg-purple-300 rounded-xl px-5 py-3 mt-5 mb-10"
            >
              <Text className="text-black font-semibold text-xl">🖼 Upload from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* VIDEO Section */}
          <View className="w-11/12 m-6 bg-gray-800 rounded-2xl border border-gray-900 items-center">
            <Text className="text-white font-bold text-2xl m-4 mt-6">VIDEO</Text>
            <TouchableOpacity
              onPress={() => pickVideo(false)}
              className="bg-purple-400 rounded-xl px-5 py-3 mt-4"
            >
              <Text className="text-black font-semibold text-xl">🎥 Record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickVideo(true)}
              className="bg-purple-300 rounded-xl px-5 py-3 mt-5 mb-10"
            >
              <Text className="text-black font-semibold text-xl">📂 Upload from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {loading && <ActivityIndicator size="large" color="#a78bfa" style={{ margin: 20 }} />}

          {/* Preview */}
          {imageUri && <Image source={{ uri: imageUri }} style={{ width: 250, height: 250, borderRadius: 12, margin: 20 }} />}
          {videoUri && (
            <Video
              source={{ uri: videoUri }}
              style={{ width: 300, height: 200, borderRadius: 12, margin: 20 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
            />
          )}

          {/* Result */}
          {result && (
            <Text className="text-white text-lg text-center mt-4">
              ✅ Sign: {result.label} {"\n"}
              📊 Confidence: {(result.confidence * 100).toFixed(1)}%
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
